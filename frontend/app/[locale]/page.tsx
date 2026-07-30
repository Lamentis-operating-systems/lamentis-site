import { EmptyPage } from "@/components/site/empty-page";
import { JsonLd } from "@/components/site/json-ld";
import { getRouteCopy } from "@/domain/site/content";
import { structuredDataForRoute } from "@/domain/site/seo";
import {
  metadataForLocalizedRoute,
  resolvePageLocale,
  type LocalizedPageProps,
} from "./_lib/locale-route";

export function generateMetadata({ params }: LocalizedPageProps) {
  return metadataForLocalizedRoute(params, "home");
}

export default async function HomePage({ params }: LocalizedPageProps) {
  const locale = await resolvePageLocale(params);
  const ref = { scope: "localized", locale, routeId: "home" } as const;
  const structuredData = structuredDataForRoute(ref);

  return (
    <>
      <EmptyPage label={getRouteCopy(locale, "home").title} />
      {structuredData ? <JsonLd data={structuredData} /> : null}
    </>
  );
}
