import type { MetadataRoute } from "next";
import {
  indexableRouteIds,
  routeAlternates,
  routeUrl,
  supportedLocales,
} from "@/domain/site/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRouteIds.flatMap((routeId) =>
    supportedLocales.map((locale) => ({
      url: routeUrl(locale, routeId),
      alternates: { languages: routeAlternates(routeId) },
    })),
  );
}
