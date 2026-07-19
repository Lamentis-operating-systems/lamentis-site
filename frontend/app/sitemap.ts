import type { MetadataRoute } from "next";
import {
  indexableRouteIds,
  routeAlternates,
  routeVariants,
} from "@/domain/site/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRouteIds.flatMap((routeId) =>
    routeVariants(routeId).flatMap((variant) => (
      variant.scope === "localized"
        ? [{
            url: variant.url,
            alternates: { languages: routeAlternates(variant.routeId) },
          }]
        : []
    )),
  );
}
