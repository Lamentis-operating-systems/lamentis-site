"use client";

import type { RefObject } from "react";
import type {
  HttpMethod,
} from "@/domain/site/api-route";
import {
  BracedPathInput,
  type BracedPathValidationReason,
} from "./braced-path-input";
import { InputSurface } from "./form/input-surface";
import textInputStyles from "./form/text-input.module.css";
import { HttpMethodSelector } from "./http-method-selector";
import styles from "./api-route-input-bar.module.css";

type ApiRouteInputBarProps = {
  actionLabel?: string;
  className?: string;
  disabledMethods?: readonly HttpMethod[];
  getValidationReason: (
    method: HttpMethod,
    path: string,
  ) => BracedPathValidationReason | null;
  initialPath?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  label: string;
  layout?: "combined" | "split";
  method: HttpMethod;
  methodSelectorLabel: string;
  onAdd?: (path: string) => void;
  onMethodChange: (method: HttpMethod) => void;
  onPathChange?: (path: string) => void;
  placeholder: string;
  preferredInitialFocus?: "path" | "response";
  prefixHint: string;
  required?: boolean;
  tone?: "default" | "nested";
  validationMessages: Readonly<
    Record<BracedPathValidationReason, string>
  >;
};

export function ApiRouteInputBar({
  actionLabel,
  className,
  disabledMethods = [],
  getValidationReason,
  initialPath,
  inputRef,
  label,
  layout = "combined",
  method,
  methodSelectorLabel,
  onAdd,
  onMethodChange,
  onPathChange,
  placeholder,
  preferredInitialFocus = "path",
  prefixHint,
  required = false,
  tone = "default",
  validationMessages,
}: ApiRouteInputBarProps) {
  const pathInput = (
    <BracedPathInput
      actionLabel={actionLabel}
      className={textInputStyles.input}
      getValidationReason={(path) => (
        getValidationReason(method, path)
      )}
      initialPath={initialPath}
      inputRef={inputRef}
      label={label}
      onAdd={onAdd}
      onPathChange={onPathChange}
      placeholder={placeholder}
      preferredInitialFocus={preferredInitialFocus === "path"}
      prefixHint={prefixHint}
      required={required}
      validationMessages={validationMessages}
    />
  );

  if (layout === "split") {
    return (
      <div
        className={`${styles.split} ${className ?? ""}`.trim()}
        role="group"
        aria-label={label}
      >
        <HttpMethodSelector
          disabledMethods={disabledMethods}
          height="large"
          label={methodSelectorLabel}
          onChange={onMethodChange}
          rounded
          value={method}
        />
        <InputSurface tone={tone}>
          {pathInput}
        </InputSurface>
      </div>
    );
  }

  return (
    <InputSurface
      className={className}
      role="group"
      aria-label={label}
      tone={tone}
      withLeadingControl
    >
      <HttpMethodSelector
        disabledMethods={disabledMethods}
        label={methodSelectorLabel}
        onChange={onMethodChange}
        value={method}
      />
      {pathInput}
    </InputSurface>
  );
}
