import type { Metadata } from "next";
import { defaultSiteIcons, iconsForRoute } from "./assets";
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
  type GlobalRouteId,
  type Locale,
  type LocalizedRouteId,
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

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: `%s | ${siteName}` },
  applicationName: siteName,
  description: "Lamentis is a platform for discovering and sharing sites.",
  icons: defaultSiteIcons,
};

function createRouteMetadata(
  locale: Locale,
  routeId: LocalizedRouteId | GlobalRouteId,
  canonical: string,
  languages?: Record<string, string>,
): Metadata {
  const copy = getRouteCopy(locale, routeId);
  const route = siteRoutes[routeId];
  const alternateLocales = route.scope === "localized"
    ? supportedLocales
        .filter((candidate) => candidate !== locale)
        .map((candidate) => localeMetadata[candidate].openGraphLocale)
    : undefined;
  const images = route.kind === "home" ? defaultSocialImages : undefined;

  return {
    title: copy.title,
    description: copy.description,
    icons: iconsForRoute(routeId),
    alternates: {
      canonical,
      languages,
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

export function metadataForRoute(locale: Locale, routeId: LocalizedRouteId): Metadata {
  return createRouteMetadata(
    locale,
    routeId,
    routePath(locale, routeId),
    routeAlternates(routeId),
  );
}

export function metadataForGlobalRoute(routeId: GlobalRouteId): Metadata {
  const route = siteRoutes[routeId];
  return createRouteMetadata(
    route.documentLocale,
    routeId,
    routeUrl(routeId),
  );
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
