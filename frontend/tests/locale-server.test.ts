import { describe, expect, it } from "vitest";
import { resolveLocaleFromAcceptLanguage } from "@/domain/site/locale-server";

describe("Accept-Language negotiation", () => {
  it("respects quality weights", () => {
    expect(resolveLocaleFromAcceptLanguage("en;q=0.4,de-DE;q=0.9")).toBe("de");
  });

  it("maps regional English to the supported locale", () => {
    expect(resolveLocaleFromAcceptLanguage("en-GB,en;q=0.8")).toBe("en");
  });

  it("falls back to English for unsupported or missing languages", () => {
    expect(resolveLocaleFromAcceptLanguage("fr-FR,es;q=0.9")).toBe("en");
    expect(resolveLocaleFromAcceptLanguage(null)).toBe("en");
  });

  it("handles wildcard and malformed ranges without throwing", () => {
    expect(resolveLocaleFromAcceptLanguage("*")).toBe("en");
    expect(resolveLocaleFromAcceptLanguage("de;q=0.8,*;q=0.5")).toBe("de");
    expect(resolveLocaleFromAcceptLanguage("!!!")).toBe("en");
  });
});
