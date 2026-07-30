import type { Metadata } from "next";
import { EmptyPage } from "@/components/site/empty-page";
import { getRouteCopy } from "@/domain/site/content";
import { metadataForRoute } from "@/domain/site/seo";
import { resolveGlobalContentLocale } from "../_lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveGlobalContentLocale();
  return metadataForRoute({ scope: "global", routeId: "addSite" }, locale);
}

export default async function AddSitePage() {
  const locale = await resolveGlobalContentLocale();
  return <EmptyPage label={getRouteCopy(locale, "addSite").title} />;
}
