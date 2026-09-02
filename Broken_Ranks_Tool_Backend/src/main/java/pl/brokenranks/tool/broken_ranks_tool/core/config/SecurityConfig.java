package pl.brokenranks.tool.broken_ranks_tool.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import pl.brokenranks.tool.broken_ranks_tool.core.exception.ApiError;

/** Security policy for the public, same-origin SPA and API. */
@Configuration
public class SecurityConfig {

    private static final String CONTENT_SECURITY_POLICY =
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
                    + "script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; "
                    + "frame-ancestors 'none'";

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper)
            throws Exception {
        return http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.disable())
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(formLogin -> formLogin.disable())
                .logout(logout -> logout.disable())
                .requestCache(requestCache -> requestCache.disable())
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        requests ->
                                requests.requestMatchers("/actuator/health", "/actuator/health/**")
                                        .permitAll()
                                        .requestMatchers("/actuator/**")
                                        .denyAll()
                                        .requestMatchers(HttpMethod.GET, "/**")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST,
                                                "/api/calculator/calculate",
                                                "/api/optimizer/drifs")
                                        .permitAll()
                                        .anyRequest()
                                        .denyAll())
                .exceptionHandling(
                        exceptions ->
                                exceptions
                                        .authenticationEntryPoint(
                                                (request, response, exception) ->
                                                        writeForbidden(response, objectMapper))
                                        .accessDeniedHandler(
                                                (request, response, exception) ->
                                                        writeForbidden(response, objectMapper)))
                .headers(
                        headers -> {
                            headers.contentSecurityPolicy(
                                    policy -> policy.policyDirectives(CONTENT_SECURITY_POLICY));
                            headers.referrerPolicy(
                                    policy ->
                                            policy.policy(
                                                    org.springframework.security.web.header.writers
                                                            .ReferrerPolicyHeaderWriter
                                                            .ReferrerPolicy.NO_REFERRER));
                            headers.permissionsPolicy(
                                    policy ->
                                            policy.policy(
                                                    "camera=(), microphone=(), geolocation=()"));
                            headers.frameOptions(frame -> frame.deny());
                            headers.httpStrictTransportSecurity(
                                    hsts -> hsts.includeSubDomains(true));
                        })
                .build();
    }

    private void writeForbidden(HttpServletResponse response, ObjectMapper objectMapper)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                new ApiError(
                        "FORBIDDEN", "Dostęp do zasobu jest zabroniony.", MDC.get("requestId")));
    }
}
