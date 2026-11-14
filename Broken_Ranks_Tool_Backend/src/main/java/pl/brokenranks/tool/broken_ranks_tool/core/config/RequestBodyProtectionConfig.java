package pl.brokenranks.tool.broken_ranks_tool.core.config;

import jakarta.servlet.DispatcherType;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import pl.brokenranks.tool.broken_ranks_tool.core.ratelimit.AbuseProtectionProperties;
import pl.brokenranks.tool.broken_ranks_tool.core.ratelimit.ClientAddressResolver;
import pl.brokenranks.tool.broken_ranks_tool.core.ratelimit.RequestBodyProtectionFilter;
import pl.brokenranks.tool.broken_ranks_tool.core.ratelimit.RequestBodyProtectionProperties;
import tools.jackson.databind.ObjectMapper;

/** Registers non-blocking body reception in the servlet container before security and MVC. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RequestBodyProtectionProperties.class)
public class RequestBodyProtectionConfig {
    @Bean
    FilterRegistrationBean<RequestBodyProtectionFilter> requestBodyProtectionFilter(
            RequestBodyProtectionProperties body,
            AbuseProtectionProperties abuse,
            ObjectMapper mapper,
            ClientAddressResolver addresses) {
        var registration =
                new FilterRegistrationBean<>(
                        new RequestBodyProtectionFilter(
                                body, abuse.maxRequestBytes(), mapper, addresses));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 2);
        registration.setAsyncSupported(true);
        registration.setDispatcherTypes(DispatcherType.REQUEST, DispatcherType.ASYNC);
        registration.addUrlPatterns("/*");
        return registration;
    }
}
