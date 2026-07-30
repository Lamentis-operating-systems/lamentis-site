import { cache } from "react";
import { cookies, headers } from "next/headers";
import { localePreferenceCookie } from "@/domain/site/locale-preference";
import { resolveLocaleFromAcceptLanguage } from "@/domain/site/locale-server";
import { isSupportedLocale, type Locale } from "@/domain/site/routes";

export const resolveGlobalContentLocale = cache(async (): Promise<Locale> => {
  const cookieLocale = (await cookies()).get(localePreferenceCookie.name)?.value;

  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  return resolveLocaleFromAcceptLanguage(
    (await headers()).get("accept-language"),
  );
});
