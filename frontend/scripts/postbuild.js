import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_SEO, SEO_ROUTES, SITE_URL } from "../src/utils/seoRoutes.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.resolve(scriptDirectory, "../dist");
const templatePath = path.join(distDirectory, "index.html");
const template = readFileSync(templatePath, "utf8");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJson(value) {
  return JSON.stringify(value, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function meta(attribute, key, value) {
  return value == null
    ? ""
    : `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}">`;
}

function createSeoHead(seo) {
  const tags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    meta("name", "title", seo.title),
    meta("name", "description", seo.description),
    meta("name", "robots", seo.robots),
    seo.canonical
      ? `<link rel="canonical" href="${escapeHtml(seo.canonical)}">`
      : "",
    meta("property", "og:type", seo.openGraph?.type),
    meta("property", "og:url", seo.openGraph?.url),
    meta("property", "og:site_name", seo.openGraph?.siteName),
    meta("property", "og:title", seo.openGraph?.title),
    meta("property", "og:description", seo.openGraph?.description),
    meta("property", "og:image", seo.openGraph?.image),
    meta("property", "og:image:alt", seo.openGraph?.imageAlt),
    meta("property", "og:image:width", seo.openGraph?.imageWidth),
    meta("property", "og:image:height", seo.openGraph?.imageHeight),
    meta("property", "og:locale", seo.openGraph?.locale),
    meta("property", "article:published_time", seo.openGraph?.publishedTime),
    meta("property", "article:modified_time", seo.jsonLd?.dateModified),
    meta("name", "twitter:card", seo.twitter?.card),
    meta("name", "twitter:url", seo.twitter?.url),
    meta("name", "twitter:title", seo.twitter?.title),
    meta("name", "twitter:description", seo.twitter?.description),
    meta("name", "twitter:image", seo.twitter?.image),
    meta("name", "twitter:image:alt", seo.twitter?.imageAlt),
    seo.jsonLd
      ? `<script type="application/ld+json">${escapeJson(seo.jsonLd)}</script>`
      : "",
  ];

  return tags.filter(Boolean).join("\n    ");
}

function removeExistingSeo(head) {
  return head
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, "")
    .replace(
      /<meta\b(?=[^>]*(?:name|property)\s*=\s*["'](?:title|description|robots|og:[^"']+|twitter:[^"']+|article:[^"']+)["'])[^>]*>\s*/gi,
      ""
    )
    .replace(/<link\b(?=[^>]*rel\s*=\s*["']canonical["'])[^>]*>\s*/gi, "")
    .replace(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script\s*>\s*/gi,
      ""
    );
}

function renderHtml(seo) {
  const headCloseIndex = template.search(/<\/head\s*>/i);
  if (headCloseIndex === -1) {
    throw new Error("dist/index.html does not contain a closing head tag");
  }

  const beforeHeadClose = removeExistingSeo(template.slice(0, headCloseIndex));
  return `${beforeHeadClose.trimEnd()}\n\n    ${createSeoHead(seo)}\n  ${template.slice(headCloseIndex)}`;
}

function outputPathForRoute(route) {
  if (route === "/") return templatePath;
  if (!/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(route)) {
    throw new Error(`Unsafe SEO route: ${route}`);
  }

  return path.join(distDirectory, ...route.slice(1).split("/"), "index.html");
}

function sitemapXml(routes) {
  const entries = routes.map(([route, seo]) => {
    const lastModified =
      seo.jsonLd?.["@type"] === "Article"
        ? (seo.jsonLd.dateModified ?? seo.jsonLd.datePublished)
        : null;
    const lastmod = lastModified
      ? `\n    <lastmod>${escapeHtml(lastModified)}</lastmod>`
      : "";
    return `  <url>\n    <loc>${escapeHtml(seo.canonical ?? `${SITE_URL}${route}`)}</loc>${lastmod}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

function attributeValues(html, attribute, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagPattern = new RegExp(
    `<meta\\b(?=[^>]*${attribute}\\s*=\\s*["']${escapedKey}["'])[^>]*>`,
    "gi"
  );
  return [...html.matchAll(tagPattern)].map((match) => {
    const content = match[0].match(/content\s*=\s*["']([^"']*)["']/i);
    return content?.[1] ?? "";
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(`Postbuild validation failed: ${message}`);
}

function validateHtml(route, seo, html, assetReferences) {
  const titleMatches = [
    ...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi),
  ];
  assert(titleMatches.length === 1, `${route} must contain exactly one title`);
  assert(
    titleMatches[0][1] === escapeHtml(seo.title),
    `${route} has an incorrect title`
  );

  for (const [attribute, key, value] of [
    ["name", "title", seo.title],
    ["name", "description", seo.description],
    ["name", "robots", seo.robots],
    ["property", "og:type", seo.openGraph?.type],
    ["property", "og:url", seo.openGraph?.url],
    ["property", "og:site_name", seo.openGraph?.siteName],
    ["property", "og:title", seo.openGraph?.title],
    ["property", "og:description", seo.openGraph?.description],
    ["property", "og:image", seo.openGraph?.image],
    ["property", "og:image:alt", seo.openGraph?.imageAlt],
    ["property", "og:image:width", seo.openGraph?.imageWidth],
    ["property", "og:image:height", seo.openGraph?.imageHeight],
    ["property", "og:locale", seo.openGraph?.locale],
    ["property", "article:published_time", seo.openGraph?.publishedTime],
    ["property", "article:modified_time", seo.jsonLd?.dateModified],
    ["name", "twitter:card", seo.twitter?.card],
    ["name", "twitter:url", seo.twitter?.url],
    ["name", "twitter:title", seo.twitter?.title],
    ["name", "twitter:description", seo.twitter?.description],
    ["name", "twitter:image", seo.twitter?.image],
    ["name", "twitter:image:alt", seo.twitter?.imageAlt],
  ]) {
    const values = attributeValues(html, attribute, key);
    const expectedCount = value == null ? 0 : 1;
    assert(
      values.length === expectedCount,
      `${route} must contain ${expectedCount} ${key} tag`
    );
    if (value != null) {
      assert(
        values[0] === escapeHtml(value),
        `${route} has an incorrect ${key}`
      );
    }
  }

  const canonicalTags =
    html.match(/<link\b(?=[^>]*rel\s*=\s*["']canonical["'])[^>]*>/gi) ?? [];
  assert(
    canonicalTags.length === (seo.canonical ? 1 : 0),
    `${route} has an incorrect canonical count`
  );
  if (seo.canonical) {
    const canonicalHref = canonicalTags[0].match(
      /href\s*=\s*["']([^"']*)["']/i
    );
    assert(
      canonicalHref?.[1] === escapeHtml(seo.canonical),
      `${route} has an incorrect canonical URL`
    );
  }

  assert(
    !/<meta\b(?=[^>]*property\s*=\s*["']twitter:[^"']*["'])[^>]*>/i.test(html),
    `${route} must use name attributes for Twitter metadata`
  );

  const jsonLdMatches = [
    ...html.matchAll(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi
    ),
  ];
  assert(
    jsonLdMatches.length === (seo.jsonLd ? 1 : 0),
    `${route} has an incorrect JSON-LD count`
  );
  if (seo.jsonLd) {
    assert(
      JSON.stringify(JSON.parse(jsonLdMatches[0][1])) ===
        JSON.stringify(seo.jsonLd),
      `${route} has incorrect JSON-LD`
    );
  }

  const outputAssets =
    html.match(/(?:src|href)=["']\/assets\/[^"']+["']/g) ?? [];
  assert(
    JSON.stringify(outputAssets) === JSON.stringify(assetReferences),
    `${route} did not retain Vite asset references`
  );
}

const routeEntries = Object.entries(SEO_ROUTES);
assert(routeEntries.length > 0, "SEO_ROUTES is empty");

const canonicalUrls = routeEntries.map(([, seo]) => seo.canonical);
assert(
  canonicalUrls.every(Boolean) &&
    new Set(canonicalUrls).size === canonicalUrls.length,
  "indexable routes must have unique canonical URLs"
);

const templateAssets =
  template.match(/(?:src|href)=["']\/assets\/[^"']+["']/g) ?? [];
const generatedFiles = [];

for (const [route, seo] of routeEntries) {
  const outputPath = outputPathForRoute(route);
  const html = renderHtml(seo);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html);
  generatedFiles.push([route, outputPath, seo]);
}

const notFoundSeo = {
  ...DEFAULT_SEO,
  title: "Page Not Found | Chikoro AI",
  description: "The requested Chikoro AI page could not be found.",
  robots: "noindex,nofollow",
  openGraph: {
    ...DEFAULT_SEO.openGraph,
    url: `${SITE_URL}/404`,
    title: "Page Not Found | Chikoro AI",
    description: "The requested Chikoro AI page could not be found.",
  },
  twitter: {
    ...DEFAULT_SEO.twitter,
    url: `${SITE_URL}/404`,
    title: "Page Not Found | Chikoro AI",
    description: "The requested Chikoro AI page could not be found.",
  },
};
const notFoundPath = path.join(distDirectory, "404.html");
writeFileSync(notFoundPath, renderHtml(notFoundSeo));

const indexableRoutes = routeEntries.filter(([, seo]) =>
  /(?:^|,)index(?:,|$)/.test(seo.robots.replaceAll(" ", ""))
);
const sitemapPath = path.join(distDirectory, "sitemap.xml");
writeFileSync(sitemapPath, sitemapXml(indexableRoutes));

for (const [route, outputPath, seo] of generatedFiles) {
  validateHtml(route, seo, readFileSync(outputPath, "utf8"), templateAssets);
}
validateHtml(
  "/404",
  notFoundSeo,
  readFileSync(notFoundPath, "utf8"),
  templateAssets
);

const sitemap = readFileSync(sitemapPath, "utf8");
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => match[1]
);
assert(
  sitemapLocations.length === indexableRoutes.length &&
    new Set(sitemapLocations).size === sitemapLocations.length,
  "sitemap URLs must be complete and unique"
);
assert(
  indexableRoutes.every(([, seo]) =>
    sitemapLocations.includes(escapeHtml(seo.canonical))
  ),
  "sitemap is missing an indexable route"
);
for (const [, seo] of indexableRoutes) {
  if (seo.jsonLd?.["@type"] !== "Article") continue;
  const expectedEntry = `<loc>${escapeHtml(seo.canonical)}</loc>\n    <lastmod>${escapeHtml(
    seo.jsonLd.dateModified ?? seo.jsonLd.datePublished
  )}</lastmod>`;
  assert(
    sitemap.includes(expectedEntry),
    `sitemap has an incorrect Article date for ${seo.canonical}`
  );
}

console.log(
  `Generated and validated ${generatedFiles.length} SEO routes, 404.html, and sitemap.xml:`
);
for (const [route, outputPath] of generatedFiles) {
  console.log(`  ${route} -> ${path.relative(distDirectory, outputPath)}`);
}
console.log("  /404 -> 404.html");
console.log(`  sitemap.xml -> ${indexableRoutes.length} unique URLs`);
