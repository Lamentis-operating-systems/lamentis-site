import Link from "next/link";
import type { FooterContent, FooterLink, FooterSection } from "@/domain/site/content";
import type { Locale } from "@/domain/site/routes";
import { GitHubIcon } from "./github-icon";
import { LocaleSwitcher } from "./locale-switcher";
import { ProfileIcon } from "./profile-icon";
import styles from "./site-footer.module.css";

type SiteFooterProps = {
  locale: Locale;
  content: FooterContent;
  showLocaleSwitcher?: boolean;
};

function FooterLinkView({ link }: { link: FooterLink }) {
  const icon = link.icon === "profile"
    ? <ProfileIcon />
    : link.icon === "github"
      ? <GitHubIcon size="small" />
      : null;

  const label = (
    <span className={styles.linkContent}>
      {icon ? (
        <span className={styles.linkIcon} aria-hidden="true">{icon}</span>
      ) : null}
      <span className={styles.linkLabel}>{link.label}</span>
    </span>
  );

  if (link.kind === "internal") {
    return <Link className={styles.link} href={link.href}>{label}</Link>;
  }

  return (
    <a
      className={styles.link}
      href={link.href}
      target={link.newWindow ? "_blank" : undefined}
      rel={link.newWindow ? "noopener noreferrer" : undefined}
    >
      {label}
    </a>
  );
}

function FooterSectionView({ section }: { section: FooterSection }) {
  return (
    <section className={styles.column} aria-labelledby={`footer-${section.id}`}>
      <h2 id={`footer-${section.id}`} className={styles.heading}>{section.title}</h2>
      <ul className={styles.linkList}>
        {section.links.map((link) => (
          <li key={link.id}><FooterLinkView link={link} /></li>
        ))}
      </ul>
    </section>
  );
}

export function SiteFooter({
  locale,
  content,
  showLocaleSwitcher = true,
}: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={`siteContainer ${styles.grid}`}>
        {content.sections.map((section) => (
          <FooterSectionView key={section.id} section={section} />
        ))}
      </div>

      <div className={`siteContainer ${styles.bottom}`}>
        <p className={styles.copyright}>
          <span>{content.copyright}</span>{" "}
          <span>{content.productionCredit}</span>
        </p>
        {showLocaleSwitcher ? (
          <LocaleSwitcher
            locale={locale}
            label={content.languageLabel}
            options={content.languageOptions}
          />
        ) : null}
      </div>
    </footer>
  );
}
