import type {
  FooterContent,
  LocaleSwitcherModel,
} from "@/domain/site/content";
import layoutStyles from "../layout/site-layout.module.css";
import { FooterSection } from "./footer-section";
import { LocaleSwitcher } from "./locale-switcher";
import styles from "./site-footer.module.css";

type SiteFooterProps = {
  content: FooterContent;
  localeSwitcher: LocaleSwitcherModel | null;
};

export function SiteFooter({ content, localeSwitcher }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={`${layoutStyles.container} ${styles.grid}`}>
        {content.sections.map((section) => (
          <FooterSection key={section.id} section={section} />
        ))}
      </div>

      <div className={`${layoutStyles.container} ${styles.bottom}`}>
        <p className={styles.copyright}>
          <span>{content.copyright}</span>{" "}
          <span>{content.productionCredit}</span>
        </p>
        {localeSwitcher ? <LocaleSwitcher {...localeSwitcher} /> : null}
      </div>
    </footer>
  );
}
