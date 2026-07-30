import type { SearchContent } from "@/domain/site/content";
import textInputStyles from "./form/text-input.module.css";
import { SearchIcon } from "./icons/search-icon";
import { SearchSurface } from "./search-surface";

export function SearchPage({
  heading,
  label,
  placeholder,
}: SearchContent) {
  return (
    <SearchSurface heading={heading} label={label} role="search">
      <SearchIcon />
      <input
        className={textInputStyles.input}
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
