package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestTracingFilterTests {

    private final RequestTracingFilter filter = new RequestTracingFilter();

    @Test
    void reusesASafeClientRequestIdAndCleansTheLoggingContext() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/initial-data");
        request.addHeader(RequestTracingFilter.REQUEST_ID_HEADER, "client-request-1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(
                "client-request-1", response.getHeader(RequestTracingFilter.REQUEST_ID_HEADER));
        assertNull(MDC.get(RequestTracingFilter.REQUEST_ID));
    }
}
