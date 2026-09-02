package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SpaForwardingFilterTests {

    private final SpaForwardingFilter filter = new SpaForwardingFilter();

    @Test
    void forwardsBrowserRoutesToTheFrontendEntryPoint() throws Exception {
        MockHttpServletRequest request = request("/optimizer/configuration", "text/html");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals("/index.html", response.getForwardedUrl());
    }

    @Test
    void leavesApiAndAssetRequestsForSpring() throws Exception {
        MockHttpServletRequest apiRequest = request("/api/initial-data", "text/html");
        MockHttpServletRequest assetRequest = request("/assets/app.js", "text/html");
        MockFilterChain apiChain = new MockFilterChain();
        MockFilterChain assetChain = new MockFilterChain();

        filter.doFilter(apiRequest, new MockHttpServletResponse(), apiChain);
        filter.doFilter(assetRequest, new MockHttpServletResponse(), assetChain);

        assertEquals(apiRequest, apiChain.getRequest());
        assertEquals(assetRequest, assetChain.getRequest());
    }

    private MockHttpServletRequest request(String path, String accept) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.addHeader("Accept", accept);
        return request;
    }
}
