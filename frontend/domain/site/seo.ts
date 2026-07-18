import type { Metadata } from "next";
import { defaultSiteIcons } from "@/domain/site/assets";
import {
  contentByLocale,
  externalProfileUrls,
  type Locale,
  supportedLocales,
} from "@/domain/site/content";

export const siteUrl = "https://lamentis.de";

export const siteName = "Lamentis";

export const defaultLocale: Locale = "en";

export const aboutPersonIcons = {
  icon: [
    { url: "/assets/images/about-favicon-elias-20260523-32.png", type: "image/png", sizes: "32x32" },
    { url: "/assets/images/about-favicon-elias-20260523-64.png", type: "image/png", sizes: "64x64" },
  ],
  shortcut: "/assets/images/about-favicon-elias-20260523-32.png",
  apple: "/assets/images/about-apple-touch-elias-20260523.png",
} satisfies Metadata["icons"];

export const aboutPersonImages = [
  {
    url: "/assets/images/elias-portrait.JPG",
    width: 1200,
    height: 1200,
    alt: "Elias Papavlassopoulos",
  },
] satisfies NonNullable<Metadata["openGraph"]>["images"];

const localeMetadata: Record<Locale, { language: string; openGraphLocale: string }> = {
  en: {
    language: "en",
    openGraphLocale: "en_US",
  },
  de: {
    language: "de",
    openGraphLocale: "de_DE",
  },
};

export type SeoInput = {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  images?: NonNullable<Metadata["openGraph"]>["images"];
  icons?: Metadata["icons"];
  noIndex?: boolean;
};

export function localizedPath(locale: Locale, path: string) {
  const normalizedPath = path === "/" ? "" : path.replace(/^\/+/, "");

  return normalizedPath ? `/${locale}/${normalizedPath}` : `/${locale}`;
}

export function localizedUrl(locale: Locale, path: string) {
  return new URL(localizedPath(locale, path), siteUrl).toString();
}

export function languageAlternates(path: string) {
  return {
    ...Object.fromEntries(
      supportedLocales.map((locale) => [
        localeMetadata[locale].language,
        localizedPath(locale, path),
      ]),
    ),
    "x-default": localizedPath(defaultLocale, path),
  };
}

export function createLocalizedMetadata({
  locale,
  path,
  title,
  description,
  images = [
    {
      url: "/assets/images/app-logo-20260424.png",
      width: 1024,
      height: 1024,
      alt: siteName,
    },
  ],
  icons = defaultSiteIcons,
  noIndex = false,
}: SeoInput): Metadata {
  const canonical = localizedPath(locale, path);
  const alternateLocales = supportedLocales
    .filter((supportedLocale) => supportedLocale !== locale)
    .map((supportedLocale) => localeMetadata[supportedLocale].openGraphLocale);

  return {
    title,
    description,
    icons,
    alternates: {
      canonical,
      languages: languageAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      locale: localeMetadata[locale].openGraphLocale,
      alternateLocale: alternateLocales,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images:
        Array.isArray(images) && typeof images[0] === "object" && "url" in images[0]
          ? [String(images[0].url)]
          : undefined,
    },
    robots: noIndex
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
        },
  };
}

export function homeMetadata(locale: Locale) {
  const copy = contentByLocale[locale];

  return createLocalizedMetadata({
    locale,
    path: "/",
    title: copy.metaTitle,
    description: copy.metaDescription,
  });
}

export function organizationJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: localizedUrl(locale, "/"),
    logo: new URL("/assets/images/app-logo-20260424.png", siteUrl).toString(),
    sameAs: [externalProfileUrls.github],
  };
}

export function personJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Elias Papavlassopoulos",
    url: localizedUrl(locale, "/about/elias-papavlassopoulos"),
    image: new URL("/assets/images/elias-portrait.JPG", siteUrl).toString(),
    sameAs: [externalProfileUrls.github],
    worksFor: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
  };
}
