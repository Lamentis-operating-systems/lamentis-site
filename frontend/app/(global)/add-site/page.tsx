import type { Metadata } from "next";
import { EmptyPage } from "@/components/site/empty-page";
import { getRouteCopy } from "@/domain/site/content";
import { defaultLocale } from "@/domain/site/routes";
import { metadataForRoute } from "@/domain/site/seo";

export function generateMetadata(): Metadata {
  return metadataForRoute({ scope: "global", routeId: "addSite" });
}

export default function AddSitePage() {
  return <EmptyPage label={getRouteCopy(defaultLocale, "addSite").title} />;
}
