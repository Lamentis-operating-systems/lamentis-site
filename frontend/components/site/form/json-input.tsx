import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { TextArea } from "./text-area";
import styles from "./json-input.module.css";

type JsonInputProps = Omit<
  ComponentPropsWithoutRef<"textarea">,
  | "aria-describedby"
  | "aria-invalid"
  | "aria-label"
  | "aria-labelledby"
  | "autoCapitalize"
  | "autoComplete"
  | "autoCorrect"
  | "children"
  | "className"
  | "onChange"
  | "spellCheck"
  | "value"
> & {
  accessory?: ReactNode;
  className?: string;
  description: string;
  error?: string;
  formatAriaLabel?: string;
  formatLabel: string;
  label: string;
  onInvalidFormat?: () => void;
  onValueChange: (value: string) => void;
  tone?: "default" | "nested";
  value: string;
};

type PendingSelection = {
  end: number;
  start: number;
  value: string;
};

const jsonPairs = {
  "\"": "\"",
  "[": "]",
  "{": "}",
} as const;
const jsonIndent = "  ";

function isEscaped(value: string, index: number) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function isInsideJsonString(value: string, position: number) {
  let insideString = false;
  for (let index = 0; index < position; index += 1) {
    if (value[index] === "\"" && !isEscaped(value, index)) {
      insideString = !insideString;
    }
  }
  return insideString;
}

function lineStartAt(value: string, position: number) {
  return value.lastIndexOf("\n", position - 1) + 1;
}

function isEmptyJsonPair(value: string, openingIndex: number) {
  const opening = value[openingIndex] as keyof typeof jsonPairs | undefined;
  if (!opening || jsonPairs[opening] !== value[openingIndex + 1]) return false;
  if (opening === "\"") return !isEscaped(value, openingIndex);
  return !isInsideJsonString(value, openingIndex);
}

function isJsonPairOpening(key: string): key is keyof typeof jsonPairs {
  return Object.hasOwn(jsonPairs, key);
}

export const JsonInput = forwardRef<HTMLTextAreaElement, JsonInputProps>(
  function JsonInput({
    accessory,
    className,
    description,
    error,
    formatAriaLabel,
    formatLabel,
    id,
    label,
    onInvalidFormat,
    onKeyDown,
    onValueChange,
    rows = 4,
    tone = "default",
    value,
    ...props
  }, ref) {
    const generatedId = useId();
    const inputId = id ?? `${generatedId}-input`;
    const descriptionId = `${generatedId}-description`;
    const errorId = `${generatedId}-error`;
    const describedBy = error
      ? `${descriptionId} ${errorId}`
      : descriptionId;
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pendingSelectionRef = useRef<PendingSelection | null>(null);
    const setInputRef = useCallback((node: HTMLTextAreaElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    useLayoutEffect(() => {
      const pendingSelection = pendingSelectionRef.current;
      if (!pendingSelection) return;

      if (pendingSelection.value === value) {
        inputRef.current?.setSelectionRange(
          pendingSelection.start,
          pendingSelection.end,
        );
      }
      pendingSelectionRef.current = null;
    }, [value]);

    function updateValue(
      nextValue: string,
      selectionStart: number,
      selectionEnd = selectionStart,
    ) {
      pendingSelectionRef.current = {
        end: selectionEnd,
        start: selectionStart,
        value: nextValue,
      };
      onValueChange(nextValue);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
      onKeyDown?.(event);
      if (
        event.defaultPrevented
        || event.currentTarget.disabled
        || event.currentTarget.readOnly
        || event.nativeEvent.isComposing
        || event.nativeEvent.keyCode === 229
      ) return;

      const altGraph = event.getModifierState("AltGraph");
      const layoutCharacter = isJsonPairOpening(event.key)
        || event.key === "}"
        || event.key === "]";
      if (
        event.metaKey
        || (event.ctrlKey && !altGraph)
        || (event.altKey && !altGraph && !layoutCharacter)
      ) return;

      const input = event.currentTarget;
      const currentValue = input.value;
      const selectionStart = input.selectionStart ?? currentValue.length;
      const selectionEnd = input.selectionEnd ?? selectionStart;
      const hasSelection = selectionStart !== selectionEnd;
      const insideString = isInsideJsonString(currentValue, selectionStart);

      if (event.key === "Enter" && !insideString) {
        event.preventDefault();
        const lineStart = lineStartAt(currentValue, selectionStart);
        const currentIndent = currentValue
          .slice(lineStart, selectionStart)
          .match(/^[\t ]*/)?.[0] ?? "";
        const opening = currentValue[selectionStart - 1];
        const closing = currentValue[selectionEnd];
        const betweenPair = (
          (opening === "{" && closing === "}")
          || (opening === "[" && closing === "]")
        );
        const nextIndent = (
          opening === "{" || opening === "["
        )
          ? `${currentIndent}${jsonIndent}`
          : currentIndent;
        const insertion = betweenPair
          ? `\n${nextIndent}\n${currentIndent}`
          : `\n${nextIndent}`;

        updateValue(
          `${currentValue.slice(0, selectionStart)}${insertion}${
            currentValue.slice(selectionEnd)
          }`,
          selectionStart + 1 + nextIndent.length,
        );
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete")
        && !hasSelection
      ) {
        const openingIndex = event.key === "Backspace"
          ? selectionStart - 1
          : selectionStart;
        if (isEmptyJsonPair(currentValue, openingIndex)) {
          event.preventDefault();
          updateValue(
            `${currentValue.slice(0, openingIndex)}${
              currentValue.slice(openingIndex + 2)
            }`,
            openingIndex,
          );
          return;
        }
      }

      if (
        !hasSelection
        && (event.key === "}" || event.key === "]")
        && !insideString
        && currentValue[selectionStart] === event.key
      ) {
        event.preventDefault();
        input.setSelectionRange(selectionStart + 1, selectionStart + 1);
        return;
      }

      if (event.key === "\"") {
        if (isEscaped(currentValue, selectionStart)) return;
        if (
          !hasSelection
          && currentValue[selectionStart] === "\""
        ) {
          event.preventDefault();
          input.setSelectionRange(selectionStart + 1, selectionStart + 1);
          return;
        }
        if (insideString) return;
      }

      if (isJsonPairOpening(event.key) && !insideString) {
        event.preventDefault();
        const opening = event.key;
        const closing = jsonPairs[opening];
        const selectedValue = currentValue.slice(selectionStart, selectionEnd);
        updateValue(
          `${currentValue.slice(0, selectionStart)}${opening}${
            selectedValue
          }${closing}${currentValue.slice(selectionEnd)}`,
          selectionStart + 1,
          hasSelection ? selectionEnd + 1 : selectionStart + 1,
        );
      }
    }

    function formatJson() {
      if (!value.trim()) return;
      try {
        onValueChange(JSON.stringify(JSON.parse(value), null, 2));
      } catch {
        onInvalidFormat?.();
        document.getElementById(inputId)?.focus();
      }
    }

    return (
      <div
        className={[styles.field, className ?? ""].filter(Boolean).join(" ")}
        data-json-input
      >
        <div className={styles.header}>
          <div className={styles.copy}>
            <label className={styles.label} htmlFor={inputId}>
              {label}
            </label>
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          </div>
          <div className={styles.actions}>
            {accessory}
            <button
              aria-label={formatAriaLabel}
              className={styles.formatAction}
              disabled={!value.trim()}
              type="button"
              onClick={formatJson}
            >
              {formatLabel}
            </button>
          </div>
        </div>
        <TextArea
          {...props}
          ref={setInputRef}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          id={inputId}
          resize="none"
          rows={rows}
          spellCheck={false}
          tone={tone}
          value={value}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
        {error ? (
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
