import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/site/placeholder-page";
import { contentByLocale } from "@/domain/site/content";
import { isSupportedLocale } from "@/domain/site/routes";
import { metadataForRoute } from "@/domain/site/seo";

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return metadataForRoute(locale, "about");
}

export default async function AboutPlaceholderPage({
  params,
}: AboutPageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const copy = contentByLocale[locale];
  return <PlaceholderPage title={copy.placeholders.about.title} status={copy.placeholderStatus} />;
}
