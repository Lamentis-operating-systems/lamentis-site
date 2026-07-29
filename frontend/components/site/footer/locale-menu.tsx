"use client";

import { switchLocalePath, type Locale } from "@/domain/site/routes";
import {
  SelectMenu,
  type SelectMenuOption,
} from "../select-menu";

type LocaleMenuProps = {
  label: string;
  locale: Locale;
  options: readonly { code: Locale; label: string }[];
  pathname: string;
};

export function LocaleMenu({ label, locale, options, pathname }: LocaleMenuProps) {
  const currentLabel = options.find((option) => option.code === locale)?.label ?? locale;
  const selectOptions: SelectMenuOption[] = options.map((option) => ({
    href: switchLocalePath(pathname, option.code),
    hrefLang: option.code,
    id: option.code,
    kind: "link",
    label: option.label,
    selected: option.code === locale,
  }));

  return (
    <SelectMenu
      label={label}
      menuPlacement="top"
      options={selectOptions}
      valueLabel={currentLabel}
    />
  );
}
