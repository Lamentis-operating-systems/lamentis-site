import { JsonLd } from "@/components/site/json-ld";
import { DraggableCardRail } from "@/components/site/draggable-card-rail";
import type { Locale } from "@/domain/site/content";
import {
  naomeFaqJsonLd,
  naomeJsonLd,
  naomeSectionListJsonLd,
} from "@/domain/site/naome-page-jsonld";
import { naomeOperatingLoopItems } from "@/domain/site/naome-page-ui";

type NaomeTopicCard = {
  id: string;
  kicker: string;
  subtitle: string;
  title: string;
};

type NaomeProductPageProps = {
  ariaLabel: string;
  locale: Locale;
  tagline: string;
  title: string;
  titleClassName: string;
  titleId: string;
};

type NaomeTopicDefinition = {
  id: string;
  kicker: string;
  text: Record<Locale, readonly [title: string, subtitle: string]>;
};

function topic(
  id: string,
  kicker: string,
  enTitle: string,
  enSubtitle: string,
  deTitle: string,
  deSubtitle: string,
): NaomeTopicDefinition {
  return {
    id,
    kicker,
    text: {
      de: [deTitle, deSubtitle],
      en: [enTitle, enSubtitle],
    },
  };
}

const naomeTopicDefinitions: readonly NaomeTopicDefinition[] = [
  topic("autopoietic-software-os", "Autopoietic OS", "Software that can safely work on itself.", "Scoped, proven, and merged only with fresh evidence.", "Software, die sicher an sich selbst arbeiten kann.", "Begrenzt, bewiesen und nur mit frischer Evidenz mergebar."),
  topic("kernel-thesis", "Kernel Thesis", "State belongs to the kernel.", "Agents propose patches. NAOME owns the transaction.", "State gehört dem Kernel.", "Agents schlagen Patches vor. NAOME besitzt die Transaktion."),
  topic("background-proof-foundation", "Proof Foundation", "Receipts before trust.", "Checks become merge evidence.", "Receipts before trust.", "Checks werden zu Merge-Evidenz."),
  topic("naome-roadmap", "Roadmap", "Foundation first. Platform later.", "From local proofing to a self-improving factory kernel.", "Erst Foundation. Dann Plattform.", "Von lokalem Proofing zum selbstverbessernden Factory Kernel."),
  topic("kernel-detail", "Kernel Details", "Small modules. Hard guarantees.", "State, gates, VCS, and daemon logic stay separated.", "Kleine Module. Harte Garantien.", "State, Gates, VCS und Daemon-Logik bleiben getrennt."),
  topic("process-pipeline", "Process Pipeline", "Intent becomes transaction.", "Request, scope, patch, proof, decision.", "Intent wird Transaktion.", "Request, Scope, Patch, Proof, Entscheidung."),
  topic("state-and-stack", "Stack & State", "Local-first by design.", "Rust, SQLite, and Git worktrees keep it reproducible.", "Local-first by design.", "Rust, SQLite und Git Worktrees halten es reproduzierbar."),
  topic("safety-policies", "Policy & Gates", "Rules before throughput.", "Scope, approvals, and checks decide what can move.", "Regeln vor Durchsatz.", "Scope, Approvals und Checks entscheiden, was weiter darf."),
  topic("knowledge-operations", "Knowledge & Operations", "Memory that survives the task.", "Decisions and failures become reusable context.", "Memory, das Aufgaben überlebt.", "Entscheidungen und Fehler werden wiederverwendbarer Kontext."),
  topic("roadmap-phasing", "Build Phases", "Built in controlled releases.", "Each phase adds capability without weakening the kernel.", "In kontrollierten Releases gebaut.", "Jede Phase erweitert Fähigkeit, ohne den Kernel zu schwächen."),
  topic("current-state-and-exclusions", "Current State", "Clear claims. Clear exclusions.", "What is live, planned, and intentionally out of scope.", "Klare Claims. Klare Grenzen.", "Was live, geplant und bewusst ausgenommen ist."),
  topic("getting-started", "How to use it", "Start with bounded work.", "Define the request, run proof, promote trusted changes.", "Starte mit begrenzter Arbeit.", "Request definieren, Proof laufen lassen, Trusted Changes promoten."),
];

function getNaomeTopicCards(locale: Locale): readonly NaomeTopicCard[] {
  return naomeTopicDefinitions.map(({ id, kicker, text }) => {
    const [title, subtitle] = text[locale];

    return {
      id,
      kicker,
      subtitle,
      title,
    };
  });
}

function NaomeContentSections({ locale }: { locale: Locale }) {
  const headingPrimary =
    locale === "de"
      ? "Das NAOME System."
      : "The NAOME system.";
  const headingSecondary =
    locale === "de"
      ? "Saubere OS-Layer für autonome Softwarearbeit."
      : "Clean OS layers for autonomous software work.";

  return (
    <div className="ds-naome-card-section">
      <h2>
        <span>{headingPrimary}</span> {headingSecondary}
      </h2>
      <DraggableCardRail
        ariaLabel="NAOME system cards"
        className="ds-naome-card-rail"
      >
        {getNaomeTopicCards(locale).map((card) => (
          <article key={card.id} id={card.id} className="ds-naome-system-card">
            <div className="ds-naome-system-card__copy">
              <span>{card.kicker}</span>
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
            </div>
          </article>
        ))}
      </DraggableCardRail>
    </div>
  );
}

export function NaomeProductPage({
  ariaLabel,
  locale,
  tagline,
  title,
  titleClassName,
  titleId,
}: NaomeProductPageProps) {
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
        <NaomeContentSections locale={locale} />
        <JsonLd data={naomeJsonLd({ locale })} />
        <JsonLd data={naomeFaqJsonLd({ locale })} />
        <JsonLd data={naomeSectionListJsonLd({ locale })} />
      </section>
    </main>
  );
}
