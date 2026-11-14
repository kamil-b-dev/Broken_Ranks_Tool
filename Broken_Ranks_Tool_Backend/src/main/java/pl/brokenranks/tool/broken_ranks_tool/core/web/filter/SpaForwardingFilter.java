package pl.brokenranks.tool.broken_ranks_tool.core.web.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Serves route-specific frontend HTML and redirects old URLs to their canonical paths. */
@Component
public class SpaForwardingFilter extends OncePerRequestFilter {

    private static final Set<String> FRONTEND_ROUTES =
            Set.of("/builder", "/optimizer", "/builds", "/progression-path", "/help");
    private static final Map<String, String> LEGACY_ROUTES =
            Map.of(
                    "/kreator", "/builder",
                    "/optymalizator", "/optimizer",
                    "/buildy", "/builds",
                    "/sciezka-rozwoju", "/progression-path");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (HttpMethod.GET.matches(request.getMethod())) {
            String path = request.getRequestURI().substring(request.getContextPath().length());
            String normalized =
                    path.endsWith("/index.html")
                            ? path.substring(0, path.length() - "/index.html".length())
                            : path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
            String canonical = LEGACY_ROUTES.getOrDefault(normalized, normalized);
            if ((FRONTEND_ROUTES.contains(canonical) || canonical.isEmpty())
                    && !canonical.equals(path)
                    && !path.equals("/")) {
                String query = request.getQueryString();
                response.setStatus(HttpServletResponse.SC_MOVED_PERMANENTLY);
                response.setHeader(
                        "Location",
                        request.getContextPath()
                                + (canonical.isEmpty() ? "/" : canonical)
                                + (query == null ? "" : "?" + query));
                return;
            }
            if (FRONTEND_ROUTES.contains(path)) {
                RequestDispatcher dispatcher = request.getRequestDispatcher(path + "/index.html");
                dispatcher.forward(request, response);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
