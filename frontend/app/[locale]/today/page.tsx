import { EmptyPage } from "@/components/site/empty-page";
import { getRouteCopy } from "@/domain/site/content";
import {
  metadataForLocalizedRoute,
  resolvePageLocale,
  type LocalizedPageProps,
} from "../_lib/locale-route";

export function generateMetadata({ params }: LocalizedPageProps) {
  return metadataForLocalizedRoute(params, "today");
}

export default async function TodayPage({ params }: LocalizedPageProps) {
  const locale = await resolvePageLocale(params);
  return <EmptyPage label={getRouteCopy(locale, "today").title} />;
}
