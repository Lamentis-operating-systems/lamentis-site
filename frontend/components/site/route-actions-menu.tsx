"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CopyIcon } from "./copy-icon";
import { DeleteIcon } from "./delete-icon";
import { EditIcon } from "./edit-icon";
import { MoreIcon } from "./more-icon";
import optionStyles from "./options-menu.module.css";
import styles from "./route-actions-menu.module.css";

type RouteActionsMenuProps = {
  copyLabel: string;
  deleteLabel: string;
  editLabel: string;
  label: string;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
  path: string;
};

export function RouteActionsMenu({
  copyLabel,
  deleteLabel,
  editLabel,
  label,
  onCopy,
  onDelete,
  onEdit,
  path,
}: RouteActionsMenuProps) {
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

  function runAction(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-open={menuOpen}
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
        <MoreIcon />
      </button>

      {menuOpen ? (
        <ul
          id={menuId}
          className={`${styles.menu} ${optionStyles.menu}`}
          aria-label={label}
        >
          <li>
            <button
              type="button"
              className={optionStyles.option}
              aria-label={`${editLabel} ${path}`}
              onClick={() => runAction(onEdit)}
            >
              <EditIcon />
              <span>{editLabel}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={optionStyles.option}
              aria-label={`${copyLabel} ${path}`}
              onClick={() => runAction(onCopy)}
            >
              <CopyIcon />
              <span>{copyLabel}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`${optionStyles.option} ${optionStyles.danger}`}
              aria-label={`${deleteLabel} ${path}`}
              onClick={() => runAction(onDelete)}
            >
              <DeleteIcon />
              <span>{deleteLabel}</span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
