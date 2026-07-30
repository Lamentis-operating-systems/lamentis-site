"use client";

import Link from "next/link";
import { useId } from "react";
import { CheckIcon } from "./icons/check-icon";
import { ChevronIcon } from "./icons/chevron-icon";
import optionStyles from "./options-menu.module.css";
import styles from "./select-menu.module.css";
import { useDismissiblePopover } from "./use-dismissible-popover";

type SelectMenuBaseOption = {
  id: string;
  label: string;
};

type SelectMenuActionOption = SelectMenuBaseOption & {
  disabled?: boolean;
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
  selectedId: string;
  width?: "content" | "method";
};

export function SelectMenu({
  label,
  menuPlacement = "bottom",
  options,
  selectedId,
  width = "content",
}: SelectMenuProps) {
  const menuId = useId();
  const selectedOption = options.find((option) => option.id === selectedId);
  const {
    closePopover,
    isOpen,
    rootRef,
    togglePopover,
    triggerRef,
  } = useDismissiblePopover();

  function selectAction(option: SelectMenuActionOption) {
    option.onSelect();
    closePopover(true);
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-open={isOpen}
      data-placement={menuPlacement}
      data-width={width}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={togglePopover}
      >
        <span>{selectedOption?.label ?? selectedId}</span>
        <ChevronIcon />
      </button>

      {isOpen ? (
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
                      aria-current={
                        option.id === selectedId ? "page" : undefined
                      }
                      hrefLang={option.hrefLang}
                      onClick={() => closePopover()}
                    >
                      <span>{option.label}</span>
                      {option.id === selectedId ? <CheckIcon /> : null}
                    </Link>
                  )
                : (
                    <button
                      type="button"
                      className={`${styles.option} ${optionStyles.option}`}
                      aria-pressed={option.id === selectedId}
                      disabled={option.disabled}
                      onClick={() => selectAction(option)}
                    >
                      <span>{option.label}</span>
                      {option.id === selectedId ? <CheckIcon /> : null}
                    </button>
                  )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
