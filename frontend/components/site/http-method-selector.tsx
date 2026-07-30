"use client";

import {
  httpMethods,
  type HttpMethod,
} from "@/domain/site/api-route";
import { SelectMenu, type SelectMenuOption } from "./select-menu";

type HttpMethodSelectorProps = {
  disabledMethods?: readonly HttpMethod[];
  height?: "default" | "large";
  label: string;
  onChange: (method: HttpMethod) => void;
  rounded?: boolean;
  value: HttpMethod;
};

export function HttpMethodSelector({
  disabledMethods = [],
  height,
  label,
  onChange,
  rounded,
  value,
}: HttpMethodSelectorProps) {
  const options: SelectMenuOption[] = httpMethods.map((method) => ({
    id: method,
    disabled: disabledMethods.includes(method),
    kind: "action",
    label: method,
    onSelect: () => onChange(method),
  }));

  return (
    <SelectMenu
      height={height}
      label={label}
      options={options}
      rounded={rounded}
      selectedId={value}
      width="method"
    />
  );
}
