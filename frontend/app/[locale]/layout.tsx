import { notFound } from "next/navigation";
import { SiteDocument } from "@/components/site/site-document";
import { getSiteChromeModel } from "@/domain/site/content";
import {
  isSupportedLocale,
  supportedLocales,
} from "@/domain/site/routes";
import { siteMetadataForLocale } from "@/domain/site/seo";
import "@/styles/tokens.css";
import "@/styles/base.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return siteMetadataForLocale(locale);
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return (
    <SiteDocument chrome={getSiteChromeModel(locale)} locale={locale}>
      {children}
    </SiteDocument>
  );
}
