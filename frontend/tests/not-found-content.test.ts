import { describe, expect, it } from "vitest";
import { contentByLocale } from "@/domain/site/content";
import { getNotFoundContent } from "@/domain/site/not-found-content";
import { supportedLocales } from "@/domain/site/routes";

describe("not-found content", () => {
  it("preserves the localized copy exactly", () => {
    expect(getNotFoundContent("en")).toEqual({
      title: "Page not found",
      description: "The requested page does not exist.",
      homeLabel: "Back to Lamentis",
    });
    expect(getNotFoundContent("de")).toEqual({
      title: "Seite nicht gefunden",
      description: "Die angeforderte Seite existiert nicht.",
      homeLabel: "Zurück zu Lamentis",
    });
  });

  it("covers every supported locale outside the global content catalog", () => {
    for (const locale of supportedLocales) {
      expect(Object.values(getNotFoundContent(locale))).not.toContain("");
      expect(contentByLocale[locale]).not.toHaveProperty("notFound");
    }
  });
});
