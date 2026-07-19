"use client";

import { usePathname } from "next/navigation";
import type { LocaleSwitcherModel } from "@/domain/site/content";
import { LocaleMenu } from "./locale-menu";

type LocaleSwitcherProps = LocaleSwitcherModel;

export function LocaleSwitcher(props: LocaleSwitcherProps) {
  const pathname = usePathname();

  return <LocaleMenu key={pathname} {...props} pathname={pathname} />;
}
