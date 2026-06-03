import type { Locale } from "./content";
import { naomeArticles } from "./naome-page";
import { naomeJsonLdBase } from "./naome-page-seo";
import { localizedUrl } from "./seo";

function stripMarkdown(value: string) {
  return value.replace(/\*([^*]+)\*/g, "$1");
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function naomeFaqJsonLd({ locale }: { locale: Locale }) {
  const mainEntity = naomeArticles[locale].flatMap((article) =>
    article.sections.map((section) => ({
      "@type": "Question",
      name: section.subheadline,
      acceptedAnswer: {
        "@type": "Answer",
        text: truncateText(stripMarkdown(section.body), 320),
      },
    })),
  );

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
    about: {
      "@type": "SoftwareApplication",
      name: "NAOME",
      url: localizedUrl(locale, "naome"),
    },
    inLanguage: locale,
  };
}

export function naomeSectionListJsonLd({ locale }: { locale: Locale }) {
  const url = localizedUrl(locale, "naome");
  const siteName = naomeJsonLdBase(locale).siteName;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: locale === "de" ? "NAOME Themenübersicht" : "NAOME topic map",
    numberOfItems: naomeArticles[locale].length,
    itemListElement: naomeArticles[locale].map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.label,
      item: {
        "@type": "Article",
        headline: article.headline,
        url: `${url}#${article.id}`,
        author: { "@type": "Organization", name: siteName },
        inLanguage: locale,
      },
    })),
  };
}
