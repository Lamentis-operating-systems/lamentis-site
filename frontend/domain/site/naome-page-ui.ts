import type { Locale } from "./content";

type TextTuple = readonly [label: string, text: string];

export const naomeOperatingLoopItems: Record<Locale, readonly TextTuple[]> = {
  en: [
    ["Scope.", " Paths, outputs, and required checks are fixed before context is selected."],
    ["Isolate.", " The agent runs inside that boundary and returns the actual diff."],
    ["Prove.", " Lint, build, tests, and semantics are checked against the same base revision."],
    ["Merge.", " The change lands only while scope, patch, and proof still match."],
  ],
  de: [
    ["Scope.", " Pfade, Outputs und Checks stehen fest, bevor Kontext geladen wird."],
    ["Isolate.", " Der Agent laeuft in dieser Grenze und liefert den echten Diff."],
    ["Prove.", " Lint, Build, Tests und Semantics laufen gegen dieselbe Base Revision."],
    ["Merge.", " Die Aenderung landet nur, solange Scope, Patch und Proof zusammenpassen."],
  ],
};
