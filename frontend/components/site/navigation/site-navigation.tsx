"use client";

import { usePathname } from "next/navigation";
import type { NavigationContent } from "@/domain/site/content";
import { matchRoute } from "@/domain/site/routes";
import { NavigationMenu } from "./navigation-menu";

type SiteNavigationProps = {
  content: NavigationContent;
};

export function SiteNavigation({ content }: SiteNavigationProps) {
  const pathname = usePathname();
  const activeRouteId = matchRoute(pathname)?.routeId ?? null;

  return (
    <NavigationMenu
      key={pathname}
      activeRouteId={activeRouteId}
      content={content}
    />
  );
}
