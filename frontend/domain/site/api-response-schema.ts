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
const reservedTypeScriptDeclarationNames = new Set([
  "any",
  "await",
  "bigint",
  "boolean",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "never",
  "new",
  "null",
  "number",
  "object",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "string",
  "super",
  "switch",
  "symbol",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "unknown",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

export function isValidTypeScriptTypeName(value: string): boolean {
  return (
    typeScriptIdentifierPattern.test(value)
    && !reservedTypeScriptDeclarationNames.has(value)
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function canonicalizeApiResponseSchema(
  schema: ApiResponseSchema,
): ApiResponseSchema {
  return {
    fields: [...schema.fields]
      .sort((left, right) => compareText(left.name, right.name))
      .map((field) => ({
        ...(field.type === "array"
          ? { arrayItemType: field.arrayItemType }
          : {}),
        name: field.name,
        optional: field.optional,
        type: field.type,
      })),
    typeName: schema.typeName,
  };
}

export function apiResponseSchemaSignature(
  schema: ApiResponseSchema,
): string {
  return JSON.stringify(canonicalizeApiResponseSchema(schema));
}

export function areApiResponseSchemasEquivalent(
  left: ApiResponseSchema,
  right: ApiResponseSchema,
): boolean {
  return apiResponseSchemaSignature(left) === apiResponseSchemaSignature(right);
}

export function hasIncompatibleApiResponseSchema(
  schemas: readonly ApiResponseSchema[],
  candidate: ApiResponseSchema,
): boolean {
  return schemas.some((schema) => (
    schema.typeName === candidate.typeName
    && !areApiResponseSchemasEquivalent(schema, candidate)
  ));
}

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

  if (!isValidTypeScriptTypeName(schema.typeName)) return false;

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
      || (
        field.type !== "array"
        && field.arrayItemType !== undefined
      )
    ) {
      return false;
    }

    propertyNames.add(field.name);
  }

  return true;
}
