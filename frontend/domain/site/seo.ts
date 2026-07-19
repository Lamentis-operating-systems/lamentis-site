import type { Metadata } from "next";
import {
  assetManifest,
  assetPath,
  type IconSetId,
  type SocialImageId,
} from "./assets";
import { getRouteCopy } from "./content";
import {
  defaultLocale,
  localeCatalog,
  routeAlternates,
  routeUrl,
  siteConfig,
  siteRoutes,
  supportedLocales,
  type RouteRef,
  type SiteRouteId,
} from "./routes";

function metadataIconsForSet(iconSetId: IconSetId): Metadata["icons"] {
  const iconSet = assetManifest.iconSets[iconSetId];
  const appleAsset = assetManifest.files[iconSet.apple.assetId];

  return {
    icon: iconSet.icon.map(({ assetId, ...reference }) => {
      const asset = assetManifest.files[assetId];
      return {
        url: asset.path,
        type: asset.type,
        sizes: `${asset.width}x${asset.height}`,
        ...reference,
      };
    }),
    apple: {
      url: appleAsset.path,
      type: appleAsset.type,
      sizes: `${appleAsset.width}x${appleAsset.height}`,
    },
  };
}

function metadataSocialImage(socialImageId: SocialImageId) {
  const socialImage = assetManifest.socialImages[socialImageId];
  const asset = assetManifest.files[socialImage.assetId];

  return {
    url: new URL(asset.path, siteConfig.origin).toString(),
    width: asset.width,
    height: asset.height,
    alt: siteConfig.brandName,
  };
}

function iconsForRoute(routeId: SiteRouteId): Metadata["icons"] {
  return metadataIconsForSet(siteRoutes[routeId].seo.iconSet);
}

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteConfig.origin),
  title: {
    default: siteConfig.brandName,
    template: `%s | ${siteConfig.brandName}`,
  },
  applicationName: siteConfig.brandName,
  description: "Lamentis is a platform for discovering and sharing sites.",
  icons: metadataIconsForSet("site"),
};

export function metadataForRoute(ref: RouteRef): Metadata {
  const route = siteRoutes[ref.routeId];
  const locale = ref.scope === "localized" ? ref.locale : defaultLocale;
  const copy = getRouteCopy(locale, ref.routeId);
  const canonical = routeUrl(ref);
  const languages = ref.scope === "localized"
    ? routeAlternates(ref.routeId)
    : undefined;
  const alternateLocales = ref.scope === "localized"
    ? supportedLocales
        .filter((candidate) => candidate !== locale)
        .map((candidate) => localeCatalog[candidate].openGraphLocale)
    : undefined;
  const images = route.seo.socialImage
    ? [metadataSocialImage(route.seo.socialImage)]
    : undefined;

  return {
    title: copy.title,
    description: copy.description,
    icons: iconsForRoute(ref.routeId),
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: siteConfig.brandName,
      locale: localeCatalog[locale].openGraphLocale,
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
      index: route.seo.index,
      follow: true,
    },
  };
}

export function structuredDataForRoute(
  ref: RouteRef,
): Record<string, unknown> | null {
  const structuredData = siteRoutes[ref.routeId].seo.structuredData;

  if (structuredData !== "organization") {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.brandName,
    url: routeUrl(ref),
    logo: new URL(assetPath("brandMark"), siteConfig.origin).toString(),
    sameAs: Object.values(siteConfig.externalLinks),
  };
}
