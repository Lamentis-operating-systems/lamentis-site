import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
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
  formatLabel: string;
  label: string;
  onInvalidFormat?: () => void;
  onValueChange: (value: string) => void;
  tone?: "default" | "nested";
  value: string;
};

export const JsonInput = forwardRef<HTMLTextAreaElement, JsonInputProps>(
  function JsonInput({
    accessory,
    className,
    description,
    error,
    formatLabel,
    id,
    label,
    onInvalidFormat,
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
          ref={ref}
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
