import { notFound } from "next/navigation";
import { metadataForNotFound } from "@/domain/site/seo";
import {
  resolvePageLocale,
  type LocalizedPageProps,
} from "../_lib/locale-route";

export async function generateMetadata({ params }: LocalizedPageProps) {
  const locale = await resolvePageLocale(params);
  return metadataForNotFound(locale);
}

export default function LocalizedNotFoundRoute() {
  notFound();
}
