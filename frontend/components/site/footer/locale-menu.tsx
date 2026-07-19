"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { switchLocalePath, type Locale } from "@/domain/site/routes";
import { ChevronIcon } from "./chevron-icon";
import styles from "./locale-switcher.module.css";

type LocaleMenuProps = {
  label: string;
  locale: Locale;
  options: readonly { code: Locale; label: string }[];
  pathname: string;
};

export function LocaleMenu({ label, locale, options, pathname }: LocaleMenuProps) {
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentLabel = options.find((option) => option.code === locale)?.label ?? locale;

  useEffect(() => {
    if (!localeMenuOpen) return undefined;

    function closeOnPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setLocaleMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setLocaleMenuOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [localeMenuOpen]);

  return (
    <div ref={rootRef} className={styles.switcher}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={localeMenuOpen}
        aria-controls={menuId}
        onClick={() => setLocaleMenuOpen((open) => !open)}
      >
        <span>{currentLabel}</span>
        <ChevronIcon />
      </button>

      {localeMenuOpen ? (
        <ul id={menuId} className={styles.menu} aria-label={label}>
          {options.map((option) => (
            <li key={option.code}>
              <Link
                href={switchLocalePath(pathname, option.code)}
                className={styles.option}
                aria-current={option.code === locale ? "page" : undefined}
                hrefLang={option.code}
                onClick={() => setLocaleMenuOpen(false)}
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
