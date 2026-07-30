"use client";

import { useId } from "react";
import { CopyIcon } from "./icons/copy-icon";
import { DeleteIcon } from "./icons/delete-icon";
import { EditIcon } from "./icons/edit-icon";
import { MoreIcon } from "./icons/more-icon";
import { IconButton } from "./icon-button";
import optionStyles from "./options-menu.module.css";
import styles from "./route-actions-menu.module.css";
import { useDismissiblePopover } from "./use-dismissible-popover";

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
  const menuId = useId();
  const {
    closePopover,
    isOpen,
    rootRef,
    togglePopover,
    triggerRef,
  } = useDismissiblePopover();

  function runAction(action: () => void) {
    closePopover(true);
    action();
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-open={isOpen}
    >
      <IconButton
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={togglePopover}
      >
        <MoreIcon />
      </IconButton>

      {isOpen ? (
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
