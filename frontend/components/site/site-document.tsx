import localFont from "next/font/local";
import type { SiteChromeModel } from "@/domain/site/content";
import { localeCatalog, type Locale } from "@/domain/site/routes";
import { SiteFooter } from "./footer/site-footer";
import { SiteNavigation } from "./navigation/site-navigation";
import { mainContentId } from "./page-main";
import styles from "./site-document.module.css";

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
    <html
      lang={locale}
      dir={localeCatalog[locale].direction}
      className={inter.variable}
    >
      <body>
        <a className={styles.skipLink} href={`#${mainContentId}`}>
          {chrome.navigation.skipToContentLabel}
        </a>
        <SiteNavigation content={chrome.navigation} />
        {children}
        <SiteFooter
          content={chrome.footer}
          localeSwitcher={chrome.localeSwitcher}
        />
      </body>
    </html>
  );
}
