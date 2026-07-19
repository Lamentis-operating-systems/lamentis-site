import { SearchIcon } from "./search-icon";
import styles from "./search-page.module.css";

type SearchPageProps = {
  heading: string;
  label: string;
  placeholder: string;
};

export function SearchPage({ heading, label, placeholder }: SearchPageProps) {
  return (
    <main className={styles.page} aria-label={label}>
      <div className={styles.content}>
        <h1 className={styles.heading}>{heading}</h1>
        <div className={styles.search} role="search" aria-label={label}>
          <SearchIcon />
          <input
            className={styles.input}
            type="search"
            name="query"
            aria-label={label}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </main>
  );
}
