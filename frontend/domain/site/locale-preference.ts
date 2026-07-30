import type { Locale } from "./routes";

export const localePreferenceCookie = {
  name: "lamentis-locale",
  maxAgeSeconds: 31_536_000,
} as const;

export function serializeLocalePreference(locale: Locale): string {
  return [
    `${localePreferenceCookie.name}=${locale}`,
    "Path=/",
    `Max-Age=${localePreferenceCookie.maxAgeSeconds}`,
    "SameSite=Lax",
  ].join("; ");
}
