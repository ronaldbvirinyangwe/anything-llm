import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getRouteSeo } from "@/utils/seoRoutes";

const OWNED_ATTRIBUTE = "data-route-seo";
const SEO_SELECTORS = [
  'meta[name="title"]',
  'meta[name="description"]',
  'meta[name="keywords"]',
  'meta[name="robots"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'meta[property^="twitter:"]',
  'meta[property^="article:"]',
  'link[rel="canonical"]',
  'script[type="application/ld+json"]',
];

function removeSeoElements() {
  document.querySelectorAll(SEO_SELECTORS.join(",")).forEach((element) => {
    element.remove();
  });
}

function appendMeta(attribute, key, content) {
  if (!content) return;

  const meta = document.createElement("meta");
  meta.setAttribute(attribute, key);
  meta.setAttribute("content", content);
  meta.setAttribute(OWNED_ATTRIBUTE, "");
  document.head.appendChild(meta);
}

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getRouteSeo(pathname);
    removeSeoElements();
    document.title = seo.title;

    appendMeta("name", "title", seo.title);
    appendMeta("name", "description", seo.description);
    appendMeta("name", "robots", seo.robots);
    appendMeta("property", "og:type", seo.openGraph.type);
    appendMeta("property", "og:url", seo.openGraph.url);
    appendMeta("property", "og:site_name", seo.openGraph.siteName);
    appendMeta("property", "og:title", seo.openGraph.title);
    appendMeta("property", "og:description", seo.openGraph.description);
    appendMeta("property", "og:image", seo.openGraph.image);
    appendMeta("property", "og:image:alt", seo.openGraph.imageAlt);
    appendMeta("property", "og:image:width", seo.openGraph.imageWidth);
    appendMeta("property", "og:image:height", seo.openGraph.imageHeight);
    appendMeta("property", "og:locale", seo.openGraph.locale);
    appendMeta(
      "property",
      "article:published_time",
      seo.openGraph.publishedTime
    );
    appendMeta("name", "twitter:card", seo.twitter.card);
    appendMeta("name", "twitter:url", seo.twitter.url);
    appendMeta("name", "twitter:title", seo.twitter.title);
    appendMeta("name", "twitter:description", seo.twitter.description);
    appendMeta("name", "twitter:image", seo.twitter.image);
    appendMeta("name", "twitter:image:alt", seo.twitter.imageAlt);

    if (seo.canonical) {
      const canonical = document.createElement("link");
      canonical.rel = "canonical";
      canonical.href = seo.canonical;
      canonical.setAttribute(OWNED_ATTRIBUTE, "");
      document.head.appendChild(canonical);
    }

    if (seo.jsonLd) {
      const structuredData = document.createElement("script");
      structuredData.type = "application/ld+json";
      structuredData.textContent = JSON.stringify(seo.jsonLd);
      structuredData.setAttribute(OWNED_ATTRIBUTE, "");
      document.head.appendChild(structuredData);
    }

    return () => {
      document
        .querySelectorAll(`[${OWNED_ATTRIBUTE}]`)
        .forEach((element) => element.remove());
    };
  }, [pathname]);

  return null;
}
