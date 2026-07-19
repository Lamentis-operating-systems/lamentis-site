import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyPage } from "@/components/site/empty-page";
import { SearchPage } from "@/components/site/search-page";
import { getRouteCopy, getSearchContent } from "@/domain/site/content";
import {
  defaultLocale,
  isPrimarySectionRouteId,
  isSupportedLocale,
  matchRoute,
  primarySectionRouteIds,
  siteRoutes,
  type Locale,
  type PrimarySectionRouteId,
} from "@/domain/site/routes";
import { metadataForRoute } from "@/domain/site/seo";

export function generateStaticParams() {
  return primarySectionRouteIds.map((routeId) => ({
    section: siteRoutes[routeId].segments[defaultLocale][0],
  }));
}

type PrimaryPageProps = {
  params: Promise<{ locale: string; section: string }>;
};

type PrimaryRouteContentProps = {
  locale: Locale;
  routeId: PrimarySectionRouteId;
};

function PrimaryRouteContent({ locale, routeId }: PrimaryRouteContentProps) {
  switch (siteRoutes[routeId].kind) {
    case "empty":
      return <EmptyPage label={getRouteCopy(locale, routeId).title} />;
    case "search":
      return <SearchPage {...getSearchContent(locale)} />;
  }
}

function resolvePrimaryRoute(
  localeValue: string,
  section: string,
): { locale: Locale; routeId: PrimarySectionRouteId } {
  if (!isSupportedLocale(localeValue)) notFound();

  const match = matchRoute(`/${localeValue}/${section}`);
  if (!match || match.scope !== "localized" || !isPrimarySectionRouteId(match.routeId)) {
    notFound();
  }

  return { locale: localeValue, routeId: match.routeId };
}

export async function generateMetadata({ params }: PrimaryPageProps): Promise<Metadata> {
  const { locale: localeValue, section } = await params;
  const { locale, routeId } = resolvePrimaryRoute(localeValue, section);
  return metadataForRoute(locale, routeId);
}

export default async function PrimaryPage({ params }: PrimaryPageProps) {
  const { locale: localeValue, section } = await params;
  const { locale, routeId } = resolvePrimaryRoute(localeValue, section);
  return <PrimaryRouteContent locale={locale} routeId={routeId} />;
}
