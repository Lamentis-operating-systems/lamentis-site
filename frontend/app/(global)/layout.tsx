import { SiteDocument } from "@/components/site/site-document";
import { defaultLocale } from "@/domain/site/routes";
import { siteMetadata } from "@/domain/site/seo";
import "@/styles/tokens.css";
import "@/styles/base.css";

export const metadata = siteMetadata;

type GlobalLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function GlobalLayout({ children }: GlobalLayoutProps) {
  return (
    <SiteDocument locale={defaultLocale} showLocaleSwitcher={false}>
      {children}
    </SiteDocument>
  );
}
