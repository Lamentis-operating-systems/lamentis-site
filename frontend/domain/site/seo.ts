import type { Metadata } from "next";
import { iconsForRoute } from "./assets";
import { getRouteCopy } from "./content";
import {
  externalLinks,
  routeAlternates,
  routePath,
  routeUrl,
  siteName,
  siteRoutes,
  siteUrl,
  supportedLocales,
  type Locale,
  type SiteRouteId,
} from "./routes";

const localeMetadata: Record<Locale, { openGraphLocale: string }> = {
  en: { openGraphLocale: "en_US" },
  de: { openGraphLocale: "de_DE" },
};

const defaultSocialImages = [{
  url: "/assets/images/app-logo-20260424.png",
  width: 1024,
  height: 1024,
  alt: siteName,
}];

export function metadataForRoute(locale: Locale, routeId: SiteRouteId): Metadata {
  const copy = getRouteCopy(locale, routeId);
  const route = siteRoutes[routeId];
  const canonical = routePath(locale, routeId);
  const alternateLocales = supportedLocales
    .filter((candidate) => candidate !== locale)
    .map((candidate) => localeMetadata[candidate].openGraphLocale);
  const images = route.kind === "placeholder" ? undefined : defaultSocialImages;

  return {
    title: copy.title,
    description: copy.description,
    icons: iconsForRoute(routeId),
    alternates: {
      canonical,
      languages: routeAlternates(routeId),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName,
      locale: localeMetadata[locale].openGraphLocale,
      alternateLocale: alternateLocales,
      type: "website",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: copy.title,
      description: copy.description,
      images: images?.map((image) => image.url),
    },
    robots: {
      index: route.indexable,
      follow: true,
    },
  };
}

export function organizationJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: routeUrl(locale, "home"),
    logo: new URL("/assets/images/app-logo-20260424.png", siteUrl).toString(),
    sameAs: [externalLinks.github],
  };
}
