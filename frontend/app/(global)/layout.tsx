import { SiteDocument } from "@/components/site/site-document";
import { getGlobalSiteChromeModel } from "@/domain/site/content";
import { siteMetadata } from "@/domain/site/seo";
import { resolveGlobalContentLocale } from "./_lib/request-locale";
import "@/styles/tokens.css";
import "@/styles/base.css";

export const metadata = siteMetadata;

type GlobalLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function GlobalLayout({ children }: GlobalLayoutProps) {
  const locale = await resolveGlobalContentLocale();

  return (
    <SiteDocument
      chrome={getGlobalSiteChromeModel(locale)}
      locale={locale}
    >
      {children}
    </SiteDocument>
  );
}
