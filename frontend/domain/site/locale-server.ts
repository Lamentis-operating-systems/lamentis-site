import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { defaultLocale, supportedLocales, type Locale } from "./routes";

export function resolveLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const requestedLanguages = new Negotiator({
    headers: { "accept-language": acceptLanguage },
  }).languages();
  const validLanguages = requestedLanguages.flatMap((language) => {
    if (language === "*") return [defaultLocale];

    try {
      return Intl.getCanonicalLocales(language);
    } catch {
      return [];
    }
  });

  if (validLanguages.length === 0) return defaultLocale;
  return match(validLanguages, supportedLocales, defaultLocale) as Locale;
}
