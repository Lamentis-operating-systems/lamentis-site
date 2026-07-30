"use client";

import {
  useId,
  type ReactNode,
} from "react";
import { IconButton } from "./icon-button";
import { ChevronIcon } from "./icons/chevron-icon";
import styles from "./toggle-list.module.css";

type ToggleListProps = {
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
};

type ToggleListItemProps = {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  expanded?: boolean;
  headerClassName?: string;
  onExpandedChange?: (expanded: boolean) => void;
  panelClassName?: string;
  summary: ReactNode;
  toggleLabel: string;
};

export function ToggleList({
  "aria-label": ariaLabel,
  children,
  className,
}: ToggleListProps) {
  return (
    <ul
      className={`${styles.list} ${className ?? ""}`.trim()}
      aria-label={ariaLabel}
    >
      {children}
    </ul>
  );
}

export function ToggleListItem({
  actions,
  children,
  className,
  expanded = false,
  headerClassName,
  onExpandedChange,
  panelClassName,
  summary,
  toggleLabel,
}: ToggleListItemProps) {
  const panelId = useId();
  const canExpand = children !== undefined && children !== null;

  return (
    <li
      className={`${styles.item} ${className ?? ""}`.trim()}
      data-expanded={canExpand && expanded ? "true" : undefined}
    >
      <div
        className={`${styles.header} ${headerClassName ?? ""}`.trim()}
      >
        {summary}
        {canExpand ? (
          <IconButton
            type="button"
            className={styles.toggle}
            aria-label={toggleLabel}
            aria-controls={panelId}
            aria-expanded={expanded}
            onClick={() => onExpandedChange?.(!expanded)}
          >
            <ChevronIcon />
          </IconButton>
        ) : (
          <span className={styles.toggleSpacer} aria-hidden="true" />
        )}
        {actions}
      </div>
      {canExpand ? (
        <div
          id={panelId}
          className={`${styles.panel} ${panelClassName ?? ""}`.trim()}
          hidden={!expanded}
        >
          {children}
        </div>
      ) : null}
    </li>
  );
}
