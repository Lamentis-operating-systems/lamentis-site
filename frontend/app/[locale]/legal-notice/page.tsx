import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/site/placeholder-page";
import { contentByLocale } from "@/domain/site/content";
import { isSupportedLocale } from "@/domain/site/routes";
import { metadataForRoute } from "@/domain/site/seo";

type LegalNoticePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LegalNoticePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return metadataForRoute(locale, "legalNotice");
}

export default async function LegalNoticePage({ params }: LegalNoticePageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const copy = contentByLocale[locale];
  return <PlaceholderPage title={copy.placeholders.legalNotice.title} status={copy.placeholderStatus} />;
}
