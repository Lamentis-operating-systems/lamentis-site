import { SearchPage } from "@/components/site/search-page";
import { getSearchContent } from "@/domain/site/content";
import {
  metadataForLocalizedRoute,
  resolvePageLocale,
  type LocalizedPageProps,
} from "../_lib/locale-route";

export function generateMetadata({ params }: LocalizedPageProps) {
  return metadataForLocalizedRoute(params, "search");
}

export default async function SearchRoutePage({ params }: LocalizedPageProps) {
  const locale = await resolvePageLocale(params);
  return <SearchPage {...getSearchContent(locale)} />;
}
