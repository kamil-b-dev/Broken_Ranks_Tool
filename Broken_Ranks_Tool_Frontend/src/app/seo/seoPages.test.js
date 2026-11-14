import { expect, it } from "vitest";
import template from "../../../index.html?raw";
import { renderSeoPage } from "../../../scripts/seo-pages.mjs";
import { normalizeSiteUrl, SITE_PAGES } from "./pages";

it("generates route-specific HTML without JavaScript and preserves the application entry point", () => {
    const options = { siteUrl: "https://example.com/", verification: 'token"<>&' };
    const home = renderSeoPage(template, SITE_PAGES[0], options);
    for (const page of SITE_PAGES) {
        const html = renderSeoPage(home, page, options);
        const document = new DOMParser().parseFromString(html, "text/html");
        expect(document.title).toBe(page.title);
        expect(document.querySelector('link[rel="canonical"]').href).toBe(
            `https://example.com${page.path}`
        );
        expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
        expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
        expect(document.querySelector('meta[name="google-site-verification"]').content).toBe(
            options.verification
        );
        expect(document.querySelector("#root h1").textContent).toBe(page.heading);
        expect(document.querySelector("#root p").textContent).toBe(page.description);
        expect(document.querySelector('script[type="module"]').getAttribute("src")).toBe(
            "/src/main.jsx"
        );
        expect(document.querySelector('meta[name="robots"]').content).toBe(
            page.noindex ? "noindex, follow" : "index, follow"
        );
        expect(document.querySelectorAll("#root nav a")).toHaveLength(5);
    }
});

it.each([
    "javascript:alert(1)",
    "https://example.com/path",
    "https://user:password@example.com",
    "https://example.com/?test=1",
    "https://example.com/#test",
])("rejects invalid canonical origins: %s", (value) => {
    expect(() => normalizeSiteUrl(value)).toThrow();
});
