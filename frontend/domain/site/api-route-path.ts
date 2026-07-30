const literalSegmentPattern = /^[a-z0-9]+$/;
const parameterSegmentPattern = /^\{[a-z][a-z0-9]*\}$/;

type ApiRoutePathSegment =
  | { kind: "literal"; value: string }
  | { kind: "parameter"; name: string };

export type ParsedApiRoutePath = {
  path: string;
  segments: readonly ApiRoutePathSegment[];
};

export function parseApiRoutePath(value: string): ParsedApiRoutePath | null {
  if (!value.startsWith("/") || value.endsWith("/")) return null;

  const segments: ApiRoutePathSegment[] = [];

  for (const segment of value.slice(1).split("/")) {
    if (literalSegmentPattern.test(segment)) {
      segments.push({ kind: "literal", value: segment });
      continue;
    }

    if (parameterSegmentPattern.test(segment)) {
      segments.push({ kind: "parameter", name: segment.slice(1, -1) });
      continue;
    }

    return null;
  }

  return { path: value, segments };
}

export function isValidApiRoutePath(value: string): boolean {
  return parseApiRoutePath(value) !== null;
}
