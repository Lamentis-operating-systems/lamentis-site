import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packagePath = require.resolve("brace-expansion/package.json");
const entryPath = require.resolve("brace-expansion");
const packageMetadata = JSON.parse(readFileSync(packagePath, "utf8"));
const expectedVersion = "5.0.9";
const patchMarker = "// Lamentis CommonJS compatibility export";

if (packageMetadata.version !== expectedVersion) {
  throw new Error(
    `Refusing to patch brace-expansion ${packageMetadata.version}; expected ${expectedVersion}.`,
  );
}

const source = readFileSync(entryPath, "utf8");

if (!source.includes(patchMarker)) {
  const compatibilityExport = [
    "",
    patchMarker,
    "const lamentisBraceExpansionExports = module.exports;",
    "module.exports = lamentisBraceExpansionExports.expand;",
    "Object.assign(module.exports, lamentisBraceExpansionExports);",
    "",
  ].join("\n");

  writeFileSync(entryPath, `${source.trimEnd()}\n${compatibilityExport}`);
}

const braceExpansion = require("brace-expansion");

if (
  typeof braceExpansion !== "function" ||
  braceExpansion.expand !== braceExpansion
) {
  throw new Error("brace-expansion CommonJS compatibility export is invalid.");
}
