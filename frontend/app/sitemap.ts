import type { MetadataRoute } from "next";
import { supportedLocales } from "@/domain/site/content";
import { localizedUrl } from "@/domain/site/seo";

const indexedPaths = [
  "",
  "about/elias-papavlassopoulos",
  "legal-notice",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-05-23");

  return supportedLocales.flatMap((locale) =>
    indexedPaths.map((path) => ({
      url: localizedUrl(locale, path),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
  );
}
