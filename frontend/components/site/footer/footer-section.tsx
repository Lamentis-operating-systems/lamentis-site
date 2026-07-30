import type { FooterSection as FooterSectionModel } from "@/domain/site/content";
import { FooterLink } from "./footer-link";
import styles from "./site-footer.module.css";

type FooterSectionProps = {
  section: FooterSectionModel;
};

export function FooterSection({ section }: FooterSectionProps) {
  const hasIconColumn = section.links.some((link) => Boolean(link.icon));
  const headingId = `footer-${section.id}`;

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>{section.title}</h2>
      <ul className={styles.linkList}>
        {section.links.map((link) => (
          <li key={link.id}>
            <FooterLink link={link} reserveIconSlot={hasIconColumn} />
          </li>
        ))}
      </ul>
    </section>
  );
}
