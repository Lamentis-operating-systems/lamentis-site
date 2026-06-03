import { ArticleSection, normalizeReferenceKey } from "@/components";
import { JsonLd } from "@/components/site/json-ld";
import { NaomeFeatureGrid } from "@/components/site/naome-feature-grid";
import type { Locale } from "@/domain/site/content";
import { naomeArticles } from "@/domain/site/naome-page";
import {
  naomeFaqJsonLd,
  naomeJsonLd,
  naomeSectionListJsonLd,
} from "@/domain/site/naome-page-jsonld";
import { naomeOperatingLoopItems } from "@/domain/site/naome-page-ui";

type NaomeNavItem = {
  id: string;
  label: string;
};

type NaomeProductPageProps = {
  ariaLabel: string;
  locale: Locale;
  tagline: string;
  title: string;
  titleClassName: string;
  titleId: string;
};

function NaomeContentSections({
  locale,
  referenceTargets,
}: {
  locale: Locale;
  referenceTargets: Record<string, string>;
}) {
  return (
    <div className="ds-naome-article-stack">
      {naomeArticles[locale].map((article) => (
        <div key={article.id}>
          <ArticleSection
            boundary={false}
            id={article.id}
            label={article.label}
            blocks={[{ kind: "headline" as const, text: article.headline }]}
          />
          {article.sections.map((section, sectionIndex) => (
            <ArticleSection
              key={`${article.id}-${sectionIndex}`}
              boundary={false}
              id={getNaomeSectionId(article.id, sectionIndex)}
              label={section.subheadline}
              blocks={[
                { kind: "subheadline" as const, text: section.subheadline },
                { kind: "body" as const, text: section.body },
              ]}
              referenceTargets={referenceTargets}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function getNaomeSectionId(articleId: string, sectionIndex: number): string {
  return `${articleId}-section-${sectionIndex + 1}`;
}

function getNaomeNavItems(locale: Locale): NaomeNavItem[] {
  return naomeArticles[locale].map((article) => ({
    id: article.id,
    label: article.label,
  }));
}

function getNaomeReferenceTargets(locale: Locale): Record<string, string> {
  const targets: Record<string, string> = {};

  for (const article of naomeArticles[locale]) {
    targets[article.label] = article.id;
    targets[article.headline] = article.id;
    targets[normalizeReferenceKey(article.label)] = article.id;
    targets[normalizeReferenceKey(article.headline)] = article.id;

    for (const [sectionIndex, section] of article.sections.entries()) {
      const sectionId = getNaomeSectionId(article.id, sectionIndex);
      const normalizedSubheadline = normalizeReferenceKey(section.subheadline);
      targets[section.subheadline] = sectionId;
      targets[normalizedSubheadline] = sectionId;
    }
  }

  return targets;
}

export function NaomeProductPage({
  ariaLabel,
  locale,
  tagline,
  title,
  titleClassName,
  titleId,
}: NaomeProductPageProps) {
  const navItems = getNaomeNavItems(locale);
  const referenceTargets = getNaomeReferenceTargets(locale);

  return (
    <main className="ds-product-page ds-product-page--naome" aria-label={ariaLabel}>
      <section className="ds-page-boundary ds-naome-hero" aria-labelledby={titleId}>
        <div className="ds-naome-field" aria-hidden="true" />
        <div className="ds-naome-hero__text">
          <h1 id={titleId} className={`ds-product-title ${titleClassName}`}>
            {title}
          </h1>
          <p className="ds-naome-hero__tagline">{tagline}</p>
        </div>
      </section>
      <section className="ds-naome-loop" aria-label="NAOME operating loop">
        <div className="ds-page-boundary ds-naome-loop__grid">
          {naomeOperatingLoopItems[locale].map(([label, text], index) => (
            <article key={label} className="ds-naome-loop__item">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>
                <strong>{label}</strong>
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="ds-page-boundary ds-naome-article-layout">
        <NaomeFeatureGrid
          ariaLabel={locale === "de" ? "NAOME Themenkarte" : "NAOME topic map"}
          items={navItems}
        />
        <NaomeContentSections
          locale={locale}
          referenceTargets={referenceTargets}
        />
        <JsonLd data={naomeJsonLd({ locale })} />
        <JsonLd data={naomeFaqJsonLd({ locale })} />
        <JsonLd data={naomeSectionListJsonLd({ locale })} />
      </section>
    </main>
  );
}
