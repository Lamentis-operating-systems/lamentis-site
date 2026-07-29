"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon } from "./check-icon";
import { ChevronIcon } from "./footer/chevron-icon";
import optionStyles from "./options-menu.module.css";
import styles from "./select-menu.module.css";

type SelectMenuBaseOption = {
  id: string;
  label: string;
  selected: boolean;
};

type SelectMenuActionOption = SelectMenuBaseOption & {
  kind: "action";
  onSelect: () => void;
};

type SelectMenuLinkOption = SelectMenuBaseOption & {
  href: string;
  hrefLang?: string;
  kind: "link";
};

export type SelectMenuOption =
  | SelectMenuActionOption
  | SelectMenuLinkOption;

type SelectMenuProps = {
  label: string;
  menuPlacement?: "bottom" | "top";
  options: readonly SelectMenuOption[];
  valueLabel: string;
  width?: "content" | "method";
};

export function SelectMenu({
  label,
  menuPlacement = "bottom",
  options,
  valueLabel,
  width = "content",
}: SelectMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeOnPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function selectAction(option: SelectMenuActionOption) {
    option.onSelect();
    setMenuOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-open={menuOpen}
      data-placement={menuPlacement}
      data-width={width}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span>{valueLabel}</span>
        <ChevronIcon />
      </button>

      {menuOpen ? (
        <ul
          id={menuId}
          className={`${styles.menu} ${optionStyles.menu}`}
          aria-label={label}
        >
          {options.map((option) => (
            <li key={option.id}>
              {option.kind === "link"
                ? (
                    <Link
                      href={option.href}
                      className={`${styles.option} ${optionStyles.option}`}
                      aria-current={option.selected ? "page" : undefined}
                      hrefLang={option.hrefLang}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span>{option.label}</span>
                      {option.selected ? <CheckIcon /> : null}
                    </Link>
                  )
                : (
                    <button
                      type="button"
                      className={`${styles.option} ${optionStyles.option}`}
                      aria-pressed={option.selected}
                      onClick={() => selectAction(option)}
                    >
                      <span>{option.label}</span>
                      {option.selected ? <CheckIcon /> : null}
                    </button>
                  )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
