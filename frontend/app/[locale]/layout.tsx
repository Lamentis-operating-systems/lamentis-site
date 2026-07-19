import { notFound } from "next/navigation";
import { SiteDocument } from "@/components/site/site-document";
import {
  isSupportedLocale,
  supportedLocales,
} from "@/domain/site/routes";
import { siteMetadata } from "@/domain/site/seo";
import "@/styles/tokens.css";
import "@/styles/base.css";

export const metadata = siteMetadata;

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return <SiteDocument locale={locale}>{children}</SiteDocument>;
}
