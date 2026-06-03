import type { Metadata } from "next";
import type { Locale } from "./content";
import { createLocalizedMetadata, localizedUrl, siteName } from "./seo";

export const naomeSeoData: Record<
  Locale,
  {
    title: string;
    description: string;
    keywords: string[];
    lastModified: string;
    geoPlacename: string;
    geoRegion: string;
    latitude: string;
    longitude: string;
  }
> = {
  en: {
    title: "NAOME | Autopoietic Software OS for proof-driven development",
    description:
      "NAOME is an autopoietic software operating system for deterministic, proof-driven software evolution. Explore its kernel model, process pipeline, and production-safe automation roadmap.",
    lastModified: "2026-05-27",
    keywords: [
      "NAOME",
      "autopoietic software OS",
      "proof-driven software development",
      "software transactional kernel",
      "Rust",
      "background proof receipts",
      "deterministic gates",
      "Git automation",
      "software evolution",
      "autonomous development",
    ],
    geoPlacename: "Germany",
    geoRegion: "DE",
    latitude: "52.5200",
    longitude: "13.4050",
  },
  de: {
    title:
      "NAOME | Autopoietisches Software-OS für beweisgetriebene Software-Evolution",
    description:
      "NAOME ist ein autopoietisches Software-OS für autonome, beweisgetriebene Software-Evolution mit deterministischem Ablauf, auditierbarer Beweislage und sauberer Release-Kontrolle.",
    lastModified: "2026-05-27",
    keywords: [
      "NAOME",
      "Autopoietisches Software-OS",
      "beweisgetriebene Softwareentwicklung",
      "transaktionaler Kernel",
      "Rust",
      "Proof-Receipts",
      "deterministische Gates",
      "Git Automatisierung",
      "Software-Evolution",
      "autonomes Development",
    ],
    geoPlacename: "Deutschland",
    geoRegion: "DE",
    latitude: "52.5200",
    longitude: "13.4050",
  },
};

function naomeGeoKeywords(locale: Locale): Record<string, string> {
  const { geoPlacename, latitude, longitude, geoRegion } = naomeSeoData[locale];

  return {
    "geo.region": geoRegion,
    "geo.placename": geoPlacename,
    "geo.position": `${latitude};${longitude}`,
    ICBM: `${latitude},${longitude}`,
  };
}

function naomeSocialMetaImage() {
  return {
    url: "/assets/images/naome-texture-20260523.webp",
    width: 1800,
    height: 1012,
    alt: "NAOME project visual on Lamentis.",
  } as const;
}

export function naomeMetadata(locale: Locale): Metadata {
  const image = naomeSocialMetaImage();

  const metadata = createLocalizedMetadata({
    locale,
    path: "naome",
    title: naomeSeoData[locale].title,
    description: naomeSeoData[locale].description,
    images: [image],
    noIndex: false,
  });

  return {
    ...metadata,
    keywords: naomeSeoData[locale].keywords,
    other: {
      ...(metadata.other || {}),
      ...naomeGeoKeywords(locale),
      "twitter:card": "summary_large_image",
      "article:section": locale === "de" ? "Software-OS" : "Software OS",
      "article:tag": naomeSeoData[locale].keywords.join(","),
    },
  };
}

export function naomeJsonLdBase(locale: Locale) {
  const {
    title,
    description,
    keywords,
    lastModified,
    geoPlacename,
    geoRegion,
    latitude,
    longitude,
  } = naomeSeoData[locale];

  return {
    description,
    geoPlacename,
    geoRegion,
    keywords,
    lastModified,
    latitude,
    longitude,
    title,
    url: localizedUrl(locale, "naome"),
    siteName,
  };
}
