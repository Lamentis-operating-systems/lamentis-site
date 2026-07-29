export const apiResponseFieldTypes = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "null",
  "unknown",
] as const;

export const apiResponseArrayItemTypes = [
  "string",
  "number",
  "boolean",
  "object",
  "null",
  "unknown",
] as const;

export type ApiResponseFieldType = (typeof apiResponseFieldTypes)[number];
export type ApiResponseArrayItemType =
  (typeof apiResponseArrayItemTypes)[number];

type ApiResponseField = {
  arrayItemType?: ApiResponseArrayItemType;
  name: string;
  optional: boolean;
  type: ApiResponseFieldType;
};

export type ApiResponseSchema = {
  fields: ApiResponseField[];
  typeName: string;
};

export const typeScriptIdentifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiResponseFieldType(
  value: unknown,
): value is ApiResponseFieldType {
  return (
    typeof value === "string"
    && apiResponseFieldTypes.some((fieldType) => fieldType === value)
  );
}

function isApiResponseArrayItemType(
  value: unknown,
): value is ApiResponseArrayItemType {
  return (
    typeof value === "string"
    && apiResponseArrayItemTypes.some((itemType) => itemType === value)
  );
}

export function isValidApiResponseSchema(
  schema: unknown,
): schema is ApiResponseSchema {
  if (
    !isRecord(schema)
    || typeof schema.typeName !== "string"
    || !Array.isArray(schema.fields)
  ) {
    return false;
  }

  if (!typeScriptIdentifierPattern.test(schema.typeName)) return false;

  const propertyNames = new Set<string>();

  for (const field of schema.fields) {
    if (
      !isRecord(field)
      || typeof field.name !== "string"
      || typeof field.optional !== "boolean"
      || !isApiResponseFieldType(field.type)
      || !typeScriptIdentifierPattern.test(field.name)
      || propertyNames.has(field.name)
      || (
        field.type === "array"
        && !isApiResponseArrayItemType(field.arrayItemType)
      )
    ) {
      return false;
    }

    propertyNames.add(field.name);
  }

  return true;
}
