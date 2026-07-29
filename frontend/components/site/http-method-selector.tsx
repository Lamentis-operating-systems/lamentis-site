"use client";

import {
  httpMethods,
  type HttpMethod,
} from "@/domain/site/api-route";
import { SelectMenu, type SelectMenuOption } from "./select-menu";

type HttpMethodSelectorProps = {
  label: string;
  onChange: (method: HttpMethod) => void;
  value: HttpMethod;
};

export function HttpMethodSelector({
  label,
  onChange,
  value,
}: HttpMethodSelectorProps) {
  const options: SelectMenuOption[] = httpMethods.map((method) => ({
    id: method,
    kind: "action",
    label: method,
    onSelect: () => onChange(method),
    selected: method === value,
  }));

  return (
    <SelectMenu
      label={label}
      options={options}
      valueLabel={value}
      width="method"
    />
  );
}
