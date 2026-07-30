import type { ReactNode } from "react";
import { InputSurface } from "./form/input-surface";
import layoutStyles from "./layout/site-layout.module.css";
import styles from "./search-page.module.css";

type SearchSurfaceProps = {
  children: ReactNode;
  contentAfter?: ReactNode;
  heading: string;
  label: string;
  role: "group" | "search";
  withMethod?: boolean;
};

export function SearchSurface({
  children,
  contentAfter,
  heading,
  label,
  role,
  withMethod = false,
}: SearchSurfaceProps) {
  return (
    <main className={`${layoutStyles.main} ${styles.page}`} aria-label={label}>
      <div className={styles.content}>
        <h1 className={styles.heading}>{heading}</h1>
        <div className={styles.formArea}>
          <InputSurface
            className={styles.searchSurface}
            role={role}
            aria-label={label}
            withLeadingControl={withMethod}
          >
            {children}
          </InputSurface>
          {contentAfter}
        </div>
      </div>
    </main>
  );
}
