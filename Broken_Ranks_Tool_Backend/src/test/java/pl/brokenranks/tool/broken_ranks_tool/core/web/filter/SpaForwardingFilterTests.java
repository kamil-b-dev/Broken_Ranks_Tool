package pl.brokenranks.tool.broken_ranks_tool.core.web.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SpaForwardingFilterTests {

    private final SpaForwardingFilter filter = new SpaForwardingFilter();

    @Test
    void forwardsKnownRoutesToTheirOwnHtmlEvenWithoutAnAcceptHeader() throws Exception {
        for (String route :
                new String[] {"/builder", "/optimizer", "/builds", "/progression-path", "/help"}) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", route);
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, new MockFilterChain());

            assertEquals(route + "/index.html", response.getForwardedUrl());
        }
    }

    @Test
    void redirectsLegacyAndDuplicateUrlsPermanentlyPreservingQueriesAndContext() throws Exception {
        for (String[] route :
                new String[][] {
                    {"/kreator", "/builder"},
                    {"/optymalizator", "/optimizer"},
                    {"/buildy", "/builds"},
                    {"/sciezka-rozwoju", "/progression-path"},
                    {"/builder/", "/builder"},
                    {"/help/index.html", "/help"},
                    {"/index.html", "/"}
                }) {
            MockHttpServletRequest request = request("/tool" + route[0], "text/html");
            request.setContextPath("/tool");
            request.setQueryString("ui=mobile&topic=builder");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, new MockFilterChain());

            assertEquals(301, response.getStatus());
            assertEquals(
                    "/tool" + route[1] + "?ui=mobile&topic=builder",
                    response.getHeader("Location"));
        }
    }

    @Test
    void leavesUnknownUrlsForSpringToReturnNotFoundInsteadOfTheHomePage() throws Exception {
        for (String path :
                new String[] {
                    "/does-not-exist", "/builder/not-found", "/robots.txt", "/sitemap.xml", "/"
                }) {
            MockHttpServletRequest request = request(path, "text/html");
            MockFilterChain chain = new MockFilterChain();
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, chain);

            assertEquals(request, chain.getRequest());
            assertEquals(null, response.getForwardedUrl());
        }
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
