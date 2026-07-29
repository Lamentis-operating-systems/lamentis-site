import { SearchPage } from "@/components/site/search-page";
import { getApiCreatorStudioContent } from "@/domain/site/content";
import {
  metadataForLocalizedRoute,
  resolvePageLocale,
  type LocalizedPageProps,
} from "../_lib/locale-route";

export function generateMetadata({ params }: LocalizedPageProps) {
  return metadataForLocalizedRoute(params, "apiCreatorStudio");
}

export default async function ApiCreatorStudioPage({
  params,
}: LocalizedPageProps) {
  const locale = await resolvePageLocale(params);

  return (
    <SearchPage
      {...getApiCreatorStudioContent(locale)}
      highlightBracedInput
    />
  );
}
