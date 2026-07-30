import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type BraceExpansion = ((pattern: string) => string[]) & {
  expand: (pattern: string) => string[];
};

const require = createRequire(import.meta.url);

describe("dependency compatibility", () => {
  it("provides old and current brace-expansion CommonJS exports", () => {
    const braceExpansion = require("brace-expansion") as BraceExpansion;

    expect(braceExpansion).toBeTypeOf("function");
    expect(braceExpansion.expand).toBe(braceExpansion);
    expect(braceExpansion("a{b,c}")).toEqual(["ab", "ac"]);
  });
});
