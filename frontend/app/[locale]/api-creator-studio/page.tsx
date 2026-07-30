import { ApiCreatorStudio } from "@/components/site/api-creator-studio";
import { OverlayProvider } from "@/components/site/overlay/overlay-provider";
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
    <OverlayProvider>
      <ApiCreatorStudio {...getApiCreatorStudioContent(locale)} />
    </OverlayProvider>
  );
}
