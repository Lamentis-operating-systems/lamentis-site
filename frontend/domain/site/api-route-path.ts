const literalSegmentPattern = /^[a-z0-9]+$/;
const parameterSegmentPattern = /^\{[a-z][a-z0-9]*\}$/;

export function isValidApiRoutePath(value: string): boolean {
  if (value === "/") return true;
  if (!value.startsWith("/") || value.endsWith("/")) return false;

  return value
    .slice(1)
    .split("/")
    .every((segment) => (
      parameterSegmentPattern.test(segment)
      || literalSegmentPattern.test(segment)
    ));
}
