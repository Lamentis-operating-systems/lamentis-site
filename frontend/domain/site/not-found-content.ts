import type { Locale } from "./routes";

export type NotFoundContent = Readonly<{
  description: string;
  homeLabel: string;
  title: string;
}>;

const notFoundContentByLocale = {
  en: {
    title: "Page not found",
    description: "The requested page does not exist.",
    homeLabel: "Back to Lamentis",
  },
  de: {
    title: "Seite nicht gefunden",
    description: "Die angeforderte Seite existiert nicht.",
    homeLabel: "Zurück zu Lamentis",
  },
} as const satisfies Record<Locale, NotFoundContent>;

export function getNotFoundContent(locale: Locale): NotFoundContent {
  return notFoundContentByLocale[locale];
}
