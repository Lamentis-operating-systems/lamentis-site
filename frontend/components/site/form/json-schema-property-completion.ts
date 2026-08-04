import type {
  JsonInputTabCompletion,
  JsonInputTabCompletionContext,
} from "./json-input";

type JsonToken = {
  end: number;
  kind: "other" | "punctuation" | "string";
  start: number;
  value: string;
};

type OpenContainer = {
  depth: number;
  kind: "[" | "{";
  open: number;
  propertiesKeyStart?: number;
};

type PropertiesRange = {
  close: number;
  depth: number;
  keyStart: number;
  open: number;
};

const jsonPunctuation = new Set(["[", "]", "{", "}", ":", ","]);
const jsonIndent = "  ";

function tokenizeJson(value: string): JsonToken[] | null {
  const tokens: JsonToken[] = [];
  let index = 0;

  while (index < value.length) {
    if (/\s/u.test(value[index] ?? "")) {
      index += 1;
      continue;
    }

    const start = index;
    if (value[index] === "\"") {
      index += 1;
      while (index < value.length) {
        if (value[index] === "\\") {
          index += 2;
          continue;
        }
        if (value[index] === "\"") {
          index += 1;
          break;
        }
        index += 1;
      }
      if (value[index - 1] !== "\"") return null;
      try {
        tokens.push({
          end: index,
          kind: "string",
          start,
          value: JSON.parse(value.slice(start, index)) as string,
        });
      } catch {
        return null;
      }
      continue;
    }

    const character = value[index] ?? "";
    if (jsonPunctuation.has(character)) {
      tokens.push({
        end: index + 1,
        kind: "punctuation",
        start,
        value: character,
      });
      index += 1;
      continue;
    }

    while (
      index < value.length
      && !/\s/u.test(value[index] ?? "")
      && !jsonPunctuation.has(value[index] ?? "")
    ) {
      index += 1;
    }
    tokens.push({
      end: index,
      kind: "other",
      start,
      value: value.slice(start, index),
    });
  }

  return tokens;
}

function propertiesRanges(tokens: readonly JsonToken[]): PropertiesRange[] {
  const containers: OpenContainer[] = [];
  const ranges: PropertiesRange[] = [];

  tokens.forEach((token, index) => {
    if (token.kind !== "punctuation") return;
    if (token.value === "{" || token.value === "[") {
      const colon = tokens[index - 1];
      const key = tokens[index - 2];
      containers.push({
        depth: containers.length + 1,
        kind: token.value,
        open: token.start,
        ...(token.value === "{"
          && colon?.kind === "punctuation"
          && colon.value === ":"
          && key?.kind === "string"
          && key.value === "properties"
          ? { propertiesKeyStart: key.start }
          : {}),
      });
      return;
    }
    if (token.value !== "}" && token.value !== "]") return;

    const container = containers.pop();
    if (
      !container
      || (token.value === "}" && container.kind !== "{")
      || (token.value === "]" && container.kind !== "[")
    ) {
      return;
    }
    if (container.propertiesKeyStart !== undefined) {
      ranges.push({
        close: token.start,
        depth: container.depth,
        keyStart: container.propertiesKeyStart,
        open: container.open,
      });
    }
  });

  return ranges;
}

function lineIndentAt(value: string, position: number): string {
  const lineStart = value.lastIndexOf("\n", position - 1) + 1;
  return value.slice(lineStart, position).match(/^[\t ]*/u)?.[0] ?? "";
}

function closingIndent(value: string, range: PropertiesRange): string {
  const lineStart = value.lastIndexOf("\n", range.close - 1) + 1;
  const linePrefix = value.slice(lineStart, range.close);
  if (/^[\t ]*$/u.test(linePrefix)) return linePrefix;

  const keyIndent = lineIndentAt(value, range.keyStart);
  return keyIndent || jsonIndent.repeat(Math.max(0, range.depth - 1));
}

function propertyNames(value: string, range: PropertiesRange): Set<string> {
  const parsed = JSON.parse(value.slice(range.open, range.close + 1)) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return new Set();
  }
  return new Set(Object.keys(parsed));
}

function placeholderKey(names: ReadonlySet<string>): string {
  if (!names.has("key")) return "key";
  let suffix = 2;
  while (names.has(`key${suffix}`)) suffix += 1;
  return `key${suffix}`;
}

/**
 * Adds one valid string property at the final whitespace slot of the closest
 * JSON Schema `properties` object. Returning null leaves Tab navigation native.
 */
export function completeJsonSchemaPropertyOnTab({
  selectionEnd,
  selectionStart,
  value,
}: JsonInputTabCompletionContext): JsonInputTabCompletion | null {
  if (selectionStart !== selectionEnd) return null;
  try {
    JSON.parse(value);
  } catch {
    return null;
  }

  const tokens = tokenizeJson(value);
  if (!tokens) return null;
  const range = propertiesRanges(tokens)
    .filter((candidate) => (
      selectionStart > candidate.open
      && selectionStart <= candidate.close
      && !value.slice(selectionStart, candidate.close).trim()
    ))
    .sort((left, right) => right.open - left.open)[0];
  if (!range) return null;

  const existingNames = propertyNames(value, range);
  const key = placeholderKey(existingNames);
  const closeIndent = closingIndent(value, range);
  const propertyIndent = `${closeIndent}${jsonIndent}`;
  const innerValue = value.slice(range.open + 1, range.close);
  const trailingWhitespace = innerValue.match(/\s*$/u)?.[0] ?? "";
  const contentEnd = range.close - trailingWhitespace.length;
  const hasProperties = Boolean(innerValue.trim());
  const insertionStart = `${hasProperties ? "," : ""}\n${propertyIndent}\"`;
  const insertionEnd = `${key}\": { \"type\": \"string\" }\n${closeIndent}`;
  const nextValue = `${value.slice(0, contentEnd)}${insertionStart}${insertionEnd}${
    value.slice(range.close)
  }`;
  const keyStart = contentEnd + insertionStart.length;

  return {
    selectionEnd: keyStart + key.length,
    selectionStart: keyStart,
    value: nextValue,
  };
}
