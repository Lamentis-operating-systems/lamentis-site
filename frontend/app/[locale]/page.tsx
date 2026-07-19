import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyPage } from "@/components/site/empty-page";
import { JsonLd } from "@/components/site/json-ld";
import { contentByLocale } from "@/domain/site/content";
import { isSupportedLocale } from "@/domain/site/routes";
import { metadataForRoute, organizationJsonLd } from "@/domain/site/seo";

type LocalePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return metadataForRoute(locale, "home");
}

export default async function HomePage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return (
    <>
      <EmptyPage label={contentByLocale[locale].home.title} />
      <JsonLd data={organizationJsonLd(locale)} />
    </>
  );
}
