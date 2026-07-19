import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavigation } from "@/components/site/site-navigation";
import { defaultSiteIcons } from "@/domain/site/assets";
import { getFooterContent, getNavigationContent } from "@/domain/site/content";
import {
  isSupportedLocale,
  siteName,
  siteUrl,
  supportedLocales,
} from "@/domain/site/routes";
import "@/styles/tokens.css";
import "@/styles/base.css";

const inter = localFont({
  src: "../../fonts/inter-latin-variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const productMono = localFont({
  src: "../../fonts/cousine-latin-700.woff2",
  variable: "--font-cousine",
  weight: "700",
  style: "normal",
  display: "swap",
});

const productSerif = localFont({
  src: "../../fonts/noto-serif-latin-900.woff2",
  variable: "--font-noto-serif",
  weight: "900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: `%s | ${siteName}` },
  applicationName: siteName,
  description: "Lamentis is a portfolio of focused digital products.",
  icons: defaultSiteIcons,
};

export const dynamicParams = false;

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

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${productMono.variable} ${productSerif.variable}`}
    >
      <body>
        <SiteNavigation locale={locale} content={getNavigationContent(locale)} />
        {children}
        <SiteFooter locale={locale} content={getFooterContent(locale)} />
      </body>
    </html>
  );
}
