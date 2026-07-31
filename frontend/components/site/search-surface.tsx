import type { ReactNode } from "react";
import { InputSurface } from "./form/input-surface";
import layoutStyles from "./layout/site-layout.module.css";
import { PageMain } from "./page-main";
import styles from "./search-page.module.css";

type SearchSurfaceSharedProps = {
  contentAfter?: ReactNode;
  heading: string;
  label: string;
};

type SearchSurfaceProps = SearchSurfaceSharedProps & (
  | {
      children: ReactNode;
      role: "group" | "search";
      surface?: never;
    }
  | {
      children?: never;
      role?: never;
      surface: ReactNode;
    }
);

export function SearchSurface(props: SearchSurfaceProps) {
  const {
    contentAfter,
    heading,
    label,
  } = props;

  return (
    <PageMain
      className={`${layoutStyles.main} ${styles.page}`}
      aria-label={label}
    >
      <div className={styles.content}>
        <h1 className={styles.heading}>{heading}</h1>
        <div className={styles.formArea}>
          {"surface" in props ? (
            <div className={styles.searchSurface}>
              {props.surface}
            </div>
          ) : (
            <InputSurface
              className={styles.searchSurface}
              role={props.role}
              aria-label={label}
            >
              {props.children}
            </InputSurface>
          )}
          {contentAfter}
        </div>
      </div>
    </PageMain>
  );
}
