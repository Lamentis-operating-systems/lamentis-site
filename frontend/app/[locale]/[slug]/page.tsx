import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isSupportedLocale,
  type Locale,
  supportedLocales,
} from "@/domain/site/content";
import { createLocalizedMetadata } from "@/domain/site/seo";

const localizedPageSlugs = ["nox", "noma", "legal-notice"] as const;

type LocalizedPageSlug = (typeof localizedPageSlugs)[number];
type ProductPageSlug = Exclude<LocalizedPageSlug, "legal-notice">;
type ProductPageContent = {
  tagline: string;
  title: string;
  titleClassName: string;
};

const pageLabels: Record<Locale, Record<LocalizedPageSlug, string>> = {
  en: {
    nox: "Nox",
    noma: "Noma",
    "legal-notice": "Legal Notice",
  },
  de: {
    nox: "Nox",
    noma: "Noma",
    "legal-notice": "Impressum",
  },
};

const pageDescriptions: Record<Locale, Record<LocalizedPageSlug, string>> = {
  en: {
    nox: "Nox project page on Lamentis.",
    noma: "Noma project page on Lamentis.",
    "legal-notice":
      "Legal notice and responsible person information for Lamentis.",
  },
  de: {
    nox: "Nox-Projektseite auf Lamentis.",
    noma: "Noma-Projektseite auf Lamentis.",
    "legal-notice": "Impressum und Verantwortlichenangaben für Lamentis.",
  },
};

const noxPageCopy: Record<Locale, { tagline: string }> = {
  en: {
    tagline:
      "A mobile platform for nightclubs to host events, sell tickets, and understand their audiences, paired with a social experience that helps guests connect with their circle before, during, and after the night.",
  },
  de: {
    tagline:
      "Eine mobile Plattform, mit der Nightclubs Events veranstalten, Tickets verkaufen und ihre Zielgruppen besser verstehen, kombiniert mit einem sozialen Erlebnis, das Gäste vor, während und nach der Nacht mit ihrem Freundeskreis verbindet.",
  },
};

const nomaPageCopy: Record<Locale, { tagline: string }> = {
  en: {
    tagline:
      "An iOS task manager built around a calm daily flow: capture today's todos, organize them into projects, complete what matters, and let unfinished tasks roll into tomorrow automatically.",
  },
  de: {
    tagline:
      "Ein iOS-Task-Manager für einen klaren Tagesablauf: heutige Todos erfassen, in Projekte sortieren, Wichtiges abschließen und unerledigte Aufgaben automatisch in den nächsten Tag übernehmen.",
  },
};

function isLocalizedPageSlug(value: string): value is LocalizedPageSlug {
  return (localizedPageSlugs as readonly string[]).includes(value);
}

function ProductIntroPage({
  locale,
  slug,
  title,
  titleClassName,
  tagline,
}: {
  locale: Locale;
  slug: ProductPageSlug;
  title: string;
  titleClassName: string;
  tagline: string;
}) {
  const titleId = `${slug}-title`;

  return (
    <main
      className={`ds-product-page ds-product-page--${slug}`}
      aria-label={pageLabels[locale][slug]}
    >
      <section
        className="ds-page-boundary ds-product-intro"
        aria-labelledby={titleId}
      >
        <h1 id={titleId} className={`ds-product-title ${titleClassName}`}>
          {title}
        </h1>
        <p className="ds-product-subline">{tagline}</p>
      </section>
    </main>
  );
}

function getProductPageContent(
  locale: Locale,
  slug: ProductPageSlug,
): ProductPageContent {
  const productPageContent: Record<ProductPageSlug, ProductPageContent> = {
    nox: {
      title: "NOX",
      titleClassName: "ds-product-title--nox",
      tagline: noxPageCopy[locale].tagline,
    },
    noma: {
      title: "Noma Tasks",
      titleClassName: "ds-product-title--noma",
      tagline: nomaPageCopy[locale].tagline,
    },
  };

  return productPageContent[slug];
}

export function generateStaticParams() {
  return supportedLocales.flatMap((locale) =>
    localizedPageSlugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale) || !isLocalizedPageSlug(slug)) {
    notFound();
  }

  return createLocalizedMetadata({
    locale,
    path: slug,
    title: pageLabels[locale][slug],
    description: pageDescriptions[locale][slug],
    noIndex: slug !== "legal-notice",
  });
}

export default async function LocalizedPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale) || !isLocalizedPageSlug(slug)) {
    notFound();
  }

  if (slug === "legal-notice") {
    return <main className="ds-home-empty" aria-label={pageLabels[locale][slug]} />;
  }

  const productPageContent = getProductPageContent(locale, slug);

  return (
    <ProductIntroPage
      locale={locale}
      slug={slug}
      title={productPageContent.title}
      titleClassName={productPageContent.titleClassName}
      tagline={productPageContent.tagline}
    />
  );
}
