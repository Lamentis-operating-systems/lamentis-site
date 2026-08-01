import type { ComponentPropsWithoutRef } from "react";

export const mainContentId = "main-content";

type PageMainProps = Omit<
  ComponentPropsWithoutRef<"main">,
  "id" | "tabIndex"
>;

export function PageMain(props: PageMainProps) {
  return <main {...props} id={mainContentId} tabIndex={-1} />;
}
