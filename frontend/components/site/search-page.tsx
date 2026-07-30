import type { SearchContent } from "@/domain/site/content";
import { SearchIcon } from "./icons/search-icon";
import { SearchSurface } from "./search-surface";
import styles from "./search-page.module.css";

export function SearchPage({
  heading,
  label,
  placeholder,
}: SearchContent) {
  return (
    <SearchSurface heading={heading} label={label} role="search">
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
    </SearchSurface>
  );
}
