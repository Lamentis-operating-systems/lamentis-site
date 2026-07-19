import type { Metadata } from "next";
import { siteRoutes, type SiteIconSetId, type SiteRouteId } from "./routes";

const faviconRevision = "20260719";

function versionedAsset(path: string) {
  return `${path}?v=${faviconRevision}`;
}

export const iconSets = {
  site: {
    icon: [
      {
        url: versionedAsset("/assets/images/favicon-32-20260424.png"),
        type: "image/png",
        sizes: "32x32",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: versionedAsset("/assets/images/favicon-16-20260424.png"),
        type: "image/png",
        sizes: "16x16",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: versionedAsset("/assets/images/app-logo-20260424.png"),
        type: "image/png",
        sizes: "1024x1024",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: {
      url: versionedAsset("/assets/images/apple-touch-icon-20260424.png"),
      sizes: "180x180",
    },
  },
  about: {
    icon: [
      {
        url: versionedAsset("/assets/images/about-favicon-elias-20260523-32.png"),
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: versionedAsset("/assets/images/about-favicon-elias-20260523-64.png"),
        type: "image/png",
        sizes: "64x64",
      },
    ],
    apple: {
      url: versionedAsset("/assets/images/about-apple-touch-elias-20260523.png"),
      sizes: "180x180",
    },
  },
} satisfies Record<SiteIconSetId, Metadata["icons"]>;

export const defaultSiteIcons = iconSets.site;

export function iconsForRoute(routeId: SiteRouteId): Metadata["icons"] {
  return iconSets[siteRoutes[routeId].iconSet];
}
