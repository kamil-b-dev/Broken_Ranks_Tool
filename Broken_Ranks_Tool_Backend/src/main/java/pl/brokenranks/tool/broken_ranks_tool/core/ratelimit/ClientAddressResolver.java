package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import org.springframework.beans.factory.annotation.Value;

/** Uses transport addresses unless the deployment explicitly trusts Railway's HTTP edge. */
public class ClientAddressResolver {
    private final boolean trustRailwayClientIp;

    public ClientAddressResolver(
            @Value("${abuse-protection.trust-railway-client-ip:false}")
                    boolean trustRailwayClientIp) {
        this.trustRailwayClientIp = trustRailwayClientIp;
    }

    public String resolve(HttpServletRequest request) {
        InetAddress edge = edgeAddress(request);
        if (edge != null) return edge.getHostAddress();
        InetAddress address = literal(request.getRemoteAddr());
        return address != null ? address.getHostAddress() : "unknown";
    }

    /** An unidentified intermediary shares only the global pending-body bound. */
    public String individualClient(HttpServletRequest request) {
        InetAddress edge = edgeAddress(request);
        if (edge != null) return edge.getHostAddress();
        InetAddress remote = literal(request.getRemoteAddr());
        if (remote == null
                || remote.isAnyLocalAddress()
                || remote.isLoopbackAddress()
                || remote.isSiteLocalAddress()
                || remote.isLinkLocalAddress()) return null;
        byte[] bytes = remote.getAddress();
        if (bytes.length == 16 && (bytes[0] & 0xfe) == 0xfc
                || bytes.length == 4 && (bytes[0] & 255) == 100 && (bytes[1] & 0xc0) == 64)
            return null;
        return remote.getHostAddress();
    }

    private InetAddress edgeAddress(HttpServletRequest request) {
        if (trustRailwayClientIp) {
            var headers = request.getHeaders("X-Real-IP");
            if (headers != null && headers.hasMoreElements()) {
                String value = headers.nextElement();
                InetAddress address = headers.hasMoreElements() ? null : literal(value);
                return address;
            }
        }
        return null;
    }

    private static InetAddress literal(String value) {
        if (value == null || value.length() > 45) return null;
        try {
            if (value.matches("[0-9]{1,3}(?:\\.[0-9]{1,3}){3}")) {
                String[] octets = value.split("\\.");
                byte[] bytes = new byte[4];
                for (int i = 0; i < bytes.length; i++) {
                    int octet = Integer.parseInt(octets[i]);
                    if (octet > 255) return null;
                    bytes[i] = (byte) octet;
                }
                return InetAddress.getByAddress(bytes);
            }
            // A colon and the numeric-only alphabet keep this call on the IPv6 literal path.
            if (!value.contains(":") || !value.matches("[0-9a-fA-F:.]+")) return null;
            return InetAddress.getByName(value);
        } catch (UnknownHostException ignored) {
            return null;
        }
    }
}
