import localFont from "next/font/local";
import type { SiteChromeModel } from "@/domain/site/content";
import type { Locale } from "@/domain/site/routes";
import { SiteFooter } from "./footer/site-footer";
import { SiteNavigation } from "./navigation/site-navigation";
import { OverlayProvider } from "./overlay/overlay-provider";

const inter = localFont({
  src: "../../fonts/inter-latin-variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

type SiteDocumentProps = Readonly<{
  children: React.ReactNode;
  chrome: SiteChromeModel;
  locale: Locale;
}>;

export function SiteDocument({
  children,
  chrome,
  locale,
}: SiteDocumentProps) {
  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <OverlayProvider>
          <SiteNavigation content={chrome.navigation} />
          {children}
          <SiteFooter
            content={chrome.footer}
            localeSwitcher={chrome.localeSwitcher}
          />
        </OverlayProvider>
      </body>
    </html>
  );
}
