"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { IconButton } from "./icon-button";
import { PlusIcon } from "./icons/plus-icon";
import { VisuallyHidden } from "./visually-hidden";
import styles from "./braced-path-input.module.css";

export type BracedPathValidationReason = "duplicate" | "syntax";

type BracedPathInputProps = {
  actionLabel?: string;
  className: string;
  getValidationReason: (
    canonicalPath: string,
  ) => BracedPathValidationReason | null;
  label: string;
  initialPath?: string;
  onAdd?: (path: string) => void;
  onPathChange?: (path: string) => void;
  placeholder: string;
  prefixHint: string;
  preferredInitialFocus?: boolean;
  required?: boolean;
  validationMessages: Readonly<
    Record<BracedPathValidationReason, string>
  >;
  inputRef?: RefObject<HTMLInputElement | null>;
};

const bracedSegmentPattern = /(\{[^{}]*\})/g;
const completeBracedSegmentPattern = /^\{[^{}]*\}$/;

function formatEditablePath(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9{}/]/g, "")
    .replace(/^\/+/, "")
    .replace(/\s*\/\s*/g, " / ");
}

function canonicalPath(value: string): string {
  return `/${value.replace(/\s*\/\s*/g, "/")}`;
}

export function BracedPathInput({
  actionLabel,
  className,
  getValidationReason,
  initialPath = "",
  label,
  onAdd,
  onPathChange,
  placeholder,
  prefixHint,
  preferredInitialFocus = false,
  required = false,
  validationMessages,
  inputRef: externalInputRef,
}: BracedPathInputProps) {
  const prefixHintId = useId();
  const validationErrorId = useId();
  const [value, setValue] = useState(() => (
    formatEditablePath(initialPath)
  ));
  const [scrollLeft, setScrollLeft] = useState(0);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const segments = value.split(bracedSegmentPattern);
  const path = canonicalPath(value);
  const validationReason = value.length > 0
    ? getValidationReason(path)
    : null;
  const validationMessage = validationReason
    ? validationMessages[validationReason]
    : null;
  const valid = value.length > 0 && validationReason === null;
  const describedBy = validationMessage
    ? `${prefixHintId} ${validationErrorId}`
    : prefixHintId;

  useLayoutEffect(() => {
    const pendingSelection = pendingSelectionRef.current;
    if (!pendingSelection) return;

    inputRef.current?.setSelectionRange(
      pendingSelection.start,
      pendingSelection.end,
    );
    pendingSelectionRef.current = null;
  }, [inputRef, value]);

  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(validationMessage ?? "");
  }, [
    inputRef,
    validationMessage,
  ]);

  function setPathValue(nextValue: string) {
    setValue(nextValue);
    onPathChange?.(canonicalPath(nextValue));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.ctrlKey || event.metaKey) return;

    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? value.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;

    if (event.key === "Enter") {
      if (onAdd) {
        event.preventDefault();
        addRoute(formatEditablePath(input.value));
      }
      return;
    }

    const openingBraceIndex = (
      selectionStart === selectionEnd
      && event.key === "Backspace"
      && value[selectionStart - 1] === "{"
    )
      ? selectionStart - 1
      : (
          event.key === "Delete"
          && value[selectionStart] === "{"
          && selectionEnd <= selectionStart + 1
        )
        ? selectionStart
        : -1;

    if (openingBraceIndex >= 0) {
      const closingBraceIndex = value.indexOf("}", openingBraceIndex + 1);
      const hasNestedOpeningBrace = closingBraceIndex >= 0
        && value
          .slice(openingBraceIndex + 1, closingBraceIndex)
          .includes("{");

      if (closingBraceIndex >= 0 && !hasNestedOpeningBrace) {
        event.preventDefault();
        pendingSelectionRef.current = {
          start: openingBraceIndex,
          end: openingBraceIndex,
        };
        setPathValue(
          `${value.slice(0, openingBraceIndex)}${
            value.slice(openingBraceIndex + 1, closingBraceIndex)
          }${value.slice(closingBraceIndex + 1)}`,
        );
        return;
      }
    }

    if (event.key === " " && selectionStart === selectionEnd) {
      const openingBrace = value.lastIndexOf("{", selectionStart - 1);
      const closingBrace = value.indexOf("}", selectionEnd);
      const insideBracedSegment = openingBrace >= 0
        && closingBrace >= selectionEnd
        && !value.slice(openingBrace + 1, closingBrace).includes("}");

      if (insideBracedSegment) {
        event.preventDefault();
        const separatorStart = closingBrace + 1;

        if (value.slice(separatorStart, separatorStart + 3) === " / ") {
          input.setSelectionRange(separatorStart + 3, separatorStart + 3);
          return;
        }

        pendingSelectionRef.current = {
          start: separatorStart + 3,
          end: separatorStart + 3,
        };
        setPathValue(
          `${value.slice(0, separatorStart)} / ${value.slice(separatorStart)}`,
        );
        return;
      }
    }

    if (
      event.key === "Backspace"
      && selectionStart === selectionEnd
      && value.slice(selectionStart - 3, selectionStart) === " / "
    ) {
      event.preventDefault();
      pendingSelectionRef.current = {
        start: selectionStart - 3,
        end: selectionStart - 3,
      };
      setPathValue(
        `${value.slice(0, selectionStart - 3)}${value.slice(selectionStart)}`,
      );
      return;
    }

    if (
      event.key === "Delete"
      && selectionStart === selectionEnd
      && value.slice(selectionStart, selectionStart + 3) === " / "
    ) {
      event.preventDefault();
      pendingSelectionRef.current = {
        start: selectionStart,
        end: selectionStart,
      };
      setPathValue(
        `${value.slice(0, selectionStart)}${value.slice(selectionStart + 3)}`,
      );
      return;
    }

    if (event.key === "/" || event.key === " ") {
      event.preventDefault();
      if (
        selectionStart === 0
        || value.slice(selectionStart - 3, selectionStart) === " / "
      ) {
        return;
      }

      pendingSelectionRef.current = {
        start: selectionStart + 3,
        end: selectionStart + 3,
      };
      setPathValue(
        `${value.slice(0, selectionStart)} / ${value.slice(selectionEnd)}`,
      );
      return;
    }

    if (event.key === "{") {
      event.preventDefault();
      const selectedText = value.slice(selectionStart, selectionEnd);
      pendingSelectionRef.current = {
        start: selectionStart + 1,
        end: selectionEnd + 1,
      };
      setPathValue(
        `${value.slice(0, selectionStart)}{${selectedText}}${value.slice(selectionEnd)}`,
      );
      return;
    }

    if (
      event.key === "}"
      && selectionStart === selectionEnd
      && value[selectionStart] === "}"
    ) {
      event.preventDefault();
      input.setSelectionRange(selectionStart + 1, selectionStart + 1);
      return;
    }

    if (event.key.length === 1 && !/[a-z0-9}]/.test(event.key)) {
      event.preventDefault();
    }
  }

  function addRoute(candidateValue = value) {
    const candidatePath = canonicalPath(candidateValue);
    const candidateIsValid = candidateValue.length > 0
      && getValidationReason(candidatePath) === null;
    if (!candidateIsValid || !onAdd) return;

    onAdd(candidatePath);
    setPathValue("");
    setScrollLeft(0);
    inputRef.current?.focus();
  }

  return (
    <div className={styles.control}>
      <div className={styles.path}>
        <span className={styles.prefix} aria-hidden="true">/</span>

        <div className={styles.field}>
          {value ? (
            <div className={styles.renderedValue} aria-hidden="true">
              <span
                className={styles.scrollingValue}
                style={{ transform: `translateX(${-scrollLeft}px)` }}
              >
                {segments.map((segment, index) => (
                  completeBracedSegmentPattern.test(segment)
                    ? (
                        <span
                          key={`${segment}-${index}`}
                          className={styles.bracedSegment}
                        >
                          {segment}
                        </span>
                      )
                    : <span key={`${segment}-${index}`}>{segment}</span>
                ))}
              </span>
            </div>
          ) : null}

          <input
            ref={inputRef}
            className={`${className} ${styles.input}`}
            type="text"
            name="route"
            data-overlay-initial-focus={
              preferredInitialFocus ? "true" : undefined
            }
            aria-label={label}
            aria-describedby={describedBy}
            aria-invalid={validationReason ? true : undefined}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            required={required}
            value={value}
            onChange={(event) => {
              setPathValue(
                formatEditablePath(event.currentTarget.value),
              );
            }}
            onKeyDown={handleKeyDown}
            onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
          />
        </div>
      </div>

      <VisuallyHidden id={prefixHintId}>{prefixHint}</VisuallyHidden>
      {validationMessage ? (
        <VisuallyHidden id={validationErrorId} role="alert">
          {validationMessage}
        </VisuallyHidden>
      ) : null}

      {actionLabel && onAdd ? (
        <IconButton
          type="button"
          className={styles.action}
          aria-label={actionLabel}
          disabled={!valid}
          onClick={() => addRoute()}
        >
          <PlusIcon />
        </IconButton>
      ) : null}
    </div>
  );
}
