import { PlaceholderPage } from "@/components/site/placeholder-page";
import { contentByLocale, getRouteCopy } from "@/domain/site/content";
import {
  metadataForLocalizedRoute,
  resolvePageLocale,
  type LocalizedPageProps,
} from "../../_lib/locale-route";

export function generateMetadata({ params }: LocalizedPageProps) {
  return metadataForLocalizedRoute(params, "about");
}

export default async function AboutPlaceholderPage({
  params,
}: LocalizedPageProps) {
  const locale = await resolvePageLocale(params);
  return (
    <PlaceholderPage
      status={contentByLocale[locale].placeholderStatus}
      title={getRouteCopy(locale, "about").title}
    />
  );
}
