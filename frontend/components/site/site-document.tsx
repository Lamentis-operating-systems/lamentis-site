import localFont from "next/font/local";
import { getFooterContent, getNavigationContent } from "@/domain/site/content";
import type { Locale } from "@/domain/site/routes";
import { SiteFooter } from "./site-footer";
import { SiteNavigation } from "./site-navigation";

const inter = localFont({
  src: "../../fonts/inter-latin-variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

type SiteDocumentProps = Readonly<{
  children: React.ReactNode;
  locale: Locale;
  showLocaleSwitcher?: boolean;
}>;

export function SiteDocument({
  children,
  locale,
  showLocaleSwitcher = true,
}: SiteDocumentProps) {
  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <SiteNavigation content={getNavigationContent(locale)} />
        {children}
        <SiteFooter
          locale={locale}
          content={getFooterContent(locale)}
          showLocaleSwitcher={showLocaleSwitcher}
        />
      </body>
    </html>
  );
}
