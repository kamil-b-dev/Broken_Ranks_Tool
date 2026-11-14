import { normalizeSiteUrl, pageForPath, SITE_PAGES } from "../src/app/seo/pages.js";

export const escapeHtml = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
    );

export function renderSeoPage(template, page, { siteUrl, verification = "" }) {
    const origin = normalizeSiteUrl(siteUrl);
    const url = `${origin}${page.path}`;
    const description = escapeHtml(page.description);
    const title = escapeHtml(page.title);
    const preview = `${origin}/social-preview.png`;
    const head = [
        `<title>${title}</title>`,
        `<meta name="description" content="${description}" />`,
        `<meta name="robots" content="${page.noindex ? "noindex, follow" : "index, follow"}" />`,
        `<link rel="canonical" href="${escapeHtml(url)}" />`,
        '<meta property="og:locale" content="pl_PL" />',
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="Broken Ranks Tool" />',
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${description}" />`,
        `<meta property="og:url" content="${escapeHtml(url)}" />`,
        `<meta property="og:image" content="${escapeHtml(preview)}" />`,
        `<meta property="og:image:secure_url" content="${escapeHtml(preview)}" />`,
        '<meta property="og:image:type" content="image/png" />',
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        '<meta property="og:image:alt" content="Broken Ranks Tool" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        `<meta name="twitter:title" content="${title}" />`,
        `<meta name="twitter:description" content="${description}" />`,
        `<meta name="twitter:image" content="${escapeHtml(preview)}" />`,
        '<meta name="twitter:image:alt" content="Broken Ranks Tool" />',
        ...(verification
            ? [`<meta name="google-site-verification" content="${escapeHtml(verification)}" />`]
            : []),
    ].join("\n");
    const links = SITE_PAGES.filter((entry) => !entry.noindex)
        .map((entry) => `<a href="${entry.path}">${escapeHtml(entry.label)}</a>`)
        .join("\n");
    const content = `<main class="page-preview"><h1>${escapeHtml(page.heading)}</h1>
        <p>${description}</p><nav aria-label="Narzędzia Broken Ranks Tool">${links}</nav>
        <noscript><p>Włącz JavaScript, aby korzystać z kalkulatora i zapisywać buildy.</p></noscript></main>`;
    return template
        .replace(
            /<!-- seo:head:start -->[\s\S]*?<!-- seo:head:end -->/,
            `<!-- seo:head:start -->\n${head}\n<!-- seo:head:end -->`
        )
        .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${content}</div>`);
}

/** Emit real HTML entry points; every visitor receives the same content. */
export function seoPagesPlugin(options) {
    return {
        name: "broken-ranks-seo-pages",
        configurePreviewServer(server) {
            server.middlewares.use((request, _response, next) => {
                const url = new URL(request.url, "http://localhost");
                if (url.pathname !== "/" && SITE_PAGES.some((page) => page.path === url.pathname))
                    request.url = `${url.pathname}/index.html${url.search}`;
                next();
            });
        },
        transformIndexHtml: {
            order: "post",
            handler: (html, context) => renderSeoPage(html, pageForPath(context.path), options),
        },
        generateBundle: {
            order: "post",
            handler(_options, bundle) {
                const template = bundle["index.html"]?.source;
                if (typeof template !== "string") throw new Error("Missing frontend index.html");
                for (const page of SITE_PAGES.filter((entry) => entry.path !== "/"))
                    this.emitFile({
                        type: "asset",
                        fileName: `${page.path.slice(1)}/index.html`,
                        source: renderSeoPage(template, page, options),
                    });
                const origin = normalizeSiteUrl(options.siteUrl);
                this.emitFile({
                    type: "asset",
                    fileName: "sitemap.xml",
                    source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${SITE_PAGES.filter(
                        (page) => !page.noindex
                    )
                        .map((page) => `  <url><loc>${escapeHtml(origin + page.path)}</loc></url>`)
                        .join("\n")}\n</urlset>\n`,
                });
                this.emitFile({
                    type: "asset",
                    fileName: "robots.txt",
                    source: `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /actuator/\n\nSitemap: ${origin}/sitemap.xml\n`,
                });
            },
        },
    };
}
