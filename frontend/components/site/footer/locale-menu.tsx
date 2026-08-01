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
  const selectOptions: SelectMenuOption[] = options.map((option) => ({
    href: switchLocalePath(pathname, option.code),
    hrefLang: option.code,
    id: option.code,
    kind: "link",
    label: option.label,
    lang: option.code,
  }));

  return (
    <SelectMenu
      label={label}
      menuPlacement="top"
      options={selectOptions}
      selectedId={locale}
    />
  );
}
