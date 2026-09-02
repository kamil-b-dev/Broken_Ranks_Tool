package pl.brokenranks.tool.broken_ranks_tool.core.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Forwards browser navigation requests to the frontend entry point. */
@Component
public class SpaForwardingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (isFrontendRoute(request)) {
            RequestDispatcher dispatcher = request.getRequestDispatcher("/index.html");
            dispatcher.forward(request, response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isFrontendRoute(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String accept = request.getHeader("Accept");
        return "GET".equalsIgnoreCase(request.getMethod())
                && accept != null
                && accept.contains("text/html")
                && !path.equals("/")
                && !path.startsWith("/api/")
                && !path.equals("/api")
                && !path.startsWith("/actuator/")
                && !path.equals("/actuator")
                && !path.substring(path.lastIndexOf('/') + 1).contains(".");
    }
}
