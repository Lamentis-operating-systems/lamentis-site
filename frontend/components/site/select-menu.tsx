"use client";

import Link from "next/link";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
} from "react";
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
  height?: "default" | "large";
  label: string;
  menuPlacement?: "bottom" | "top";
  options: readonly SelectMenuOption[];
  rounded?: boolean;
  selectedId: string;
  width?: "content" | "field" | "method";
};

export function SelectMenu({
  height,
  label,
  menuPlacement = "bottom",
  options,
  rounded,
  selectedId,
  width = "content",
}: SelectMenuProps) {
  const menuId = useId();
  const menuRef = useRef<HTMLUListElement>(null);
  const postSelectionFocusRef = useRef<HTMLElement | null>(null);
  const [usesDialogLayer, setUsesDialogLayer] = useState(false);
  const selectedOption = options.find((option) => option.id === selectedId);
  const {
    closePopover,
    completeClose,
    isOpen,
    isPresent,
    phase,
    rootRef,
    togglePopover,
    triggerRef,
  } = useDismissiblePopover();

  useLayoutEffect(() => {
    setUsesDialogLayer(Boolean(
      rootRef.current?.closest("dialog")
      && "showPopover" in HTMLElement.prototype
    ));
  }, [rootRef]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!isPresent || !usesDialogLayer || !menu || !trigger) {
      return undefined;
    }
    const activeMenu = menu;
    const anchorTrigger = trigger;

    function positionMenu() {
      const triggerBounds = anchorTrigger.getBoundingClientRect();
      activeMenu.style.setProperty(
        "--dialog-popover-anchor-top",
        `${triggerBounds.top}px`,
      );
      activeMenu.style.setProperty(
        "--dialog-popover-anchor-bottom",
        `${triggerBounds.bottom}px`,
      );
      activeMenu.style.setProperty(
        "--dialog-popover-inline-start",
        `${triggerBounds.left}px`,
      );
      activeMenu.style.setProperty(
        "--dialog-popover-width",
        `${triggerBounds.width}px`,
      );
    }

    positionMenu();
    menu.showPopover();
    window.addEventListener("resize", positionMenu);
    document.addEventListener("scroll", positionMenu, true);

    return () => {
      window.removeEventListener("resize", positionMenu);
      document.removeEventListener("scroll", positionMenu, true);
      if (menu.matches(":popover-open")) menu.hidePopover();
    };
  }, [isPresent, triggerRef, usesDialogLayer]);

  useLayoutEffect(() => {
    const focusTarget = postSelectionFocusRef.current;
    if (phase !== "closed" || !focusTarget) return;

    postSelectionFocusRef.current = null;
    if (focusTarget.isConnected) focusTarget.focus();
  }, [phase]);

  function selectAction(option: SelectMenuActionOption) {
    const focusedElement = document.activeElement;
    option.onSelect();
    const nextFocusedElement = document.activeElement;
    const shouldRestoreTrigger = nextFocusedElement === focusedElement;
    postSelectionFocusRef.current = (
      !shouldRestoreTrigger
      && nextFocusedElement instanceof HTMLElement
    ) ? nextFocusedElement : null;
    closePopover(shouldRestoreTrigger);
  }

  function completeAnimatedClose(event: AnimationEvent<HTMLUListElement>) {
    if (event.target === event.currentTarget && phase === "closing") {
      completeClose();
    }
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-height={height}
      data-open={isOpen}
      data-placement={menuPlacement}
      data-rounded={rounded ? true : undefined}
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

      {isPresent ? (
        <ul
          ref={menuRef}
          id={menuId}
          className={`${styles.menu} ${optionStyles.menu}`}
          aria-label={label}
          aria-hidden={phase === "closing" ? true : undefined}
          data-dialog-layer={usesDialogLayer ? true : undefined}
          data-placement={menuPlacement}
          data-state={phase}
          inert={phase === "closing"}
          popover={usesDialogLayer ? "manual" : undefined}
          onAnimationEnd={completeAnimatedClose}
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
