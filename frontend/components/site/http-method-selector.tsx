"use client";

import {
  httpMethods,
  type HttpMethod,
} from "@/domain/site/api-route";
import { SelectMenu, type SelectMenuOption } from "./select-menu";

type HttpMethodSelectorProps = {
  disabledMethods?: readonly HttpMethod[];
  label: string;
  onChange: (method: HttpMethod) => void;
  value: HttpMethod;
};

export function HttpMethodSelector({
  disabledMethods = [],
  label,
  onChange,
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
      label={label}
      options={options}
      selectedId={value}
      width="method"
    />
  );
}
