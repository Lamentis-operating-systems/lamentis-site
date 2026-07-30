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

export type ApiResponseField = {
  arrayItemType?: ApiResponseArrayItemType;
  name: string;
  objectSchema?: ApiResponseSchema;
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
        ...(field.objectSchema
          ? { objectSchema: canonicalizeApiResponseSchema(field.objectSchema) }
          : {}),
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
  const existingSchemas = schemas.flatMap(collectApiResponseSchemas);
  const candidateSchemas = collectApiResponseSchemas(candidate);
  const candidateSchemasByTypeName =
    new Map<string, ApiResponseSchema[]>();

  for (const schema of candidateSchemas) {
    const variants = candidateSchemasByTypeName.get(schema.typeName) ?? [];
    variants.push(schema);
    candidateSchemasByTypeName.set(schema.typeName, variants);
  }

  return [...candidateSchemasByTypeName.entries()].some((
    [typeName, variants],
  ) => {
    const source = variants[0];
    return Boolean(
      source
      && (
        variants.some((variant) => (
          !areApiResponseSchemasEquivalent(source, variant)
        ))
        || existingSchemas.some((schema) => (
          schema.typeName === typeName
          && !areApiResponseSchemasEquivalent(source, schema)
        ))
      )
    );
  });
}

export function collectApiResponseSchemas(
  schema: ApiResponseSchema,
): ApiResponseSchema[] {
  return [
    schema,
    ...schema.fields.flatMap((field) => (
      field.objectSchema
        ? collectApiResponseSchemas(field.objectSchema)
        : []
    )),
  ];
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
  if (!isValidApiResponseSchemaValue(schema, new Set(), false)) return false;

  const schemas = collectApiResponseSchemas(schema);
  return !hasIncompatibleApiResponseSchema([], schemas[0]!);
}

export function isValidPersistedApiResponseSchema(
  schema: unknown,
): schema is ApiResponseSchema {
  if (!isValidApiResponseSchemaValue(schema, new Set(), true)) return false;

  const schemas = collectApiResponseSchemas(schema);
  return !hasIncompatibleApiResponseSchema([], schemas[0]!);
}

function isValidApiResponseSchemaValue(
  schema: unknown,
  ancestors: Set<unknown>,
  allowLegacyOpaqueObject: boolean,
): schema is ApiResponseSchema {
  if (
    !isRecord(schema)
    || typeof schema.typeName !== "string"
    || !Array.isArray(schema.fields)
    || ancestors.has(schema)
  ) {
    return false;
  }

  if (!isValidTypeScriptTypeName(schema.typeName)) return false;

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(schema);
  const propertyNames = new Set<string>();

  for (const field of schema.fields) {
    if (!isRecord(field)) return false;

    const requiresObjectSchema = (
      field.type === "object"
      || (
        field.type === "array"
        && field.arrayItemType === "object"
      )
    );

    if (
      typeof field.name !== "string"
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
      || (
        requiresObjectSchema
        && field.objectSchema === undefined
        && !allowLegacyOpaqueObject
      )
      || (
        requiresObjectSchema
        && field.objectSchema !== undefined
        && !isValidApiResponseSchemaValue(
          field.objectSchema,
          nextAncestors,
          allowLegacyOpaqueObject,
        )
      )
      || (
        !requiresObjectSchema
        && field.objectSchema !== undefined
      )
    ) {
      return false;
    }

    propertyNames.add(field.name);
  }

  return true;
}
