import type { ReactNode } from "react";
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
          <div
            className={`${styles.search} ${
              withMethod ? styles.searchWithMethod : ""
            }`}
            role={role}
            aria-label={label}
          >
            {children}
          </div>
          {contentAfter}
        </div>
      </div>
    </main>
  );
}
