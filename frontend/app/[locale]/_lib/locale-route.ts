import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isSupportedLocale,
  type Locale,
  type LocalizedRouteId,
} from "@/domain/site/routes";
import { metadataForRoute } from "@/domain/site/seo";

export type LocalizedPageProps = {
  params: Promise<{ locale: string }>;
};

export async function resolvePageLocale(
  params: LocalizedPageProps["params"],
): Promise<Locale> {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  return locale;
}

export async function metadataForLocalizedRoute(
  params: LocalizedPageProps["params"],
  routeId: LocalizedRouteId,
): Promise<Metadata> {
  const locale = await resolvePageLocale(params);
  return metadataForRoute({ scope: "localized", locale, routeId });
}
