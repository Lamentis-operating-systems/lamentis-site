const apiResponseFieldTypes = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "null",
  "unknown",
] as const;

const apiResponseArrayItemTypes = [
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
  defaultValue?: string;
  description?: string;
  enumValues?: string[];
  example?: string;
  maximum?: number;
  maxLength?: number;
  minimum?: number;
  minLength?: number;
  name: string;
  objectSchema?: ApiResponseSchema;
  optional: boolean;
  pattern?: string;
  type: ApiResponseFieldType;
};

export type ApiResponseSchema = {
  fields: ApiResponseField[];
  typeName: string;
};

type JsonSchemaObject = Record<string, unknown>;

const jsonSchemaFieldKeywords = new Set([
  "default",
  "description",
  "enum",
  "examples",
  "items",
  "maximum",
  "maxLength",
  "minimum",
  "minLength",
  "pattern",
  "properties",
  "required",
  "type",
]);

function isJsonSchemaObject(value: unknown): value is JsonSchemaObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyJsonSchemaFieldKeywords(value: JsonSchemaObject): boolean {
  return Object.keys(value).every((key) => jsonSchemaFieldKeywords.has(key));
}

function hasSameStringValues(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((item, index) => item === sortedRight[index]);
}

function parseJsonSchemaAnnotations(
  value: JsonSchemaObject,
  type: ApiResponseFieldType,
  existingField?: ApiResponseField,
): Omit<
  ApiResponseField,
  "arrayItemType" | "name" | "objectSchema" | "optional" | "type"
> | undefined {
  if (
    (value.description !== undefined && (
      typeof value.description !== "string" || !value.description.trim()
    ))
    || (value.default !== undefined && (
      typeof value.default !== "string" || !value.default.trim()
    ))
    || (value.examples !== undefined && (
      !Array.isArray(value.examples)
      || value.examples.length !== 1
      || typeof value.examples[0] !== "string"
      || !value.examples[0].trim()
    ))
    || (value.enum !== undefined && (
      !Array.isArray(value.enum)
      || value.enum.length === 0
      || value.enum.some((item) => typeof item !== "string" || !item.trim())
      || (
        type !== "string"
        && type !== "unknown"
        && !(
          existingField?.type === type
          && existingField.enumValues
          && hasSameStringValues(existingField.enumValues, value.enum as string[])
        )
      )
    ))
    || (value.minimum !== undefined && (
      typeof value.minimum !== "number" || !Number.isFinite(value.minimum)
      || type !== "number"
    ))
    || (value.maximum !== undefined && (
      typeof value.maximum !== "number" || !Number.isFinite(value.maximum)
      || type !== "number"
    ))
    || (value.minLength !== undefined && (
      typeof value.minLength !== "number"
      || !Number.isSafeInteger(value.minLength) || value.minLength < 0
      || type !== "string"
    ))
    || (value.maxLength !== undefined && (
      typeof value.maxLength !== "number"
      || !Number.isSafeInteger(value.maxLength) || value.maxLength < 0
      || type !== "string"
    ))
    || (value.pattern !== undefined && (
      typeof value.pattern !== "string" || !value.pattern.trim()
      || type !== "string"
    ))
  ) {
    return undefined;
  }

  const minimum = value.minimum as number | undefined;
  const maximum = value.maximum as number | undefined;
  const minLength = value.minLength as number | undefined;
  const maxLength = value.maxLength as number | undefined;
  if (
    minimum !== undefined && maximum !== undefined && minimum > maximum
    || minLength !== undefined && maxLength !== undefined && minLength > maxLength
  ) {
    return undefined;
  }

  return {
    ...(typeof value.default === "string" ? { defaultValue: value.default } : {}),
    ...(typeof value.description === "string"
      ? { description: value.description }
      : {}),
    ...(Array.isArray(value.enum) ? { enumValues: value.enum as string[] } : {}),
    ...(Array.isArray(value.examples) ? { example: value.examples[0] as string } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
    ...(maxLength !== undefined ? { maxLength } : {}),
    ...(minimum !== undefined ? { minimum } : {}),
    ...(minLength !== undefined ? { minLength } : {}),
    ...(typeof value.pattern === "string" ? { pattern: value.pattern } : {}),
  };
}

function jsonSchemaRequiredProperties(
  value: JsonSchemaObject,
  propertyNames: readonly string[],
): Set<string> | undefined {
  if (value.required === undefined) return new Set();
  if (
    !Array.isArray(value.required)
    || value.required.some((item) => typeof item !== "string")
    || new Set(value.required).size !== value.required.length
    || value.required.some((item) => !propertyNames.includes(String(item)))
  ) {
    return undefined;
  }
  return new Set(value.required as string[]);
}

function apiResponseSchemaFromJsonSchemaObject(
  typeName: string,
  value: JsonSchemaObject,
  existingSchema?: ApiResponseSchema,
): ApiResponseSchema | undefined {
  if (
    value.type !== "object"
    || Object.keys(value).some((key) => (
      key !== "type" && key !== "properties" && key !== "required"
    ))
    || !isJsonSchemaObject(value.properties)
  ) {
    return undefined;
  }

  const properties = (value.properties ?? {}) as JsonSchemaObject;
  const propertyNames = Object.keys(properties);
  if (propertyNames.some((name) => !name)) return undefined;
  const required = jsonSchemaRequiredProperties(value, propertyNames);
  if (!required) return undefined;

  const fields: ApiResponseField[] = [];
  for (const name of propertyNames) {
    const field = apiResponseFieldFromJsonSchema(
      name,
      properties[name],
      typeName,
      !required.has(name),
      existingSchema?.fields.find((candidate) => candidate.name === name),
    );
    if (!field) return undefined;
    fields.push(field);
  }
  return { fields, typeName };
}

function apiResponseArrayItemFromJsonSchema(
  name: string,
  value: unknown,
  parentTypeName: string,
  existingField?: ApiResponseField,
): Pick<ApiResponseField, "arrayItemType" | "objectSchema"> | undefined {
  if (!isJsonSchemaObject(value)) return undefined;
  if (Object.keys(value).length === 0) return { arrayItemType: "unknown" };
  if (value.type === "array" || Object.keys(value).some((key) => (
    key !== "type" && key !== "properties" && key !== "required"
  ))) {
    return undefined;
  }
  if (value.type === "object") {
    if (value.properties === undefined) {
      return existingField?.type === "array"
        && existingField.arrayItemType === "object"
        && !existingField.objectSchema
        && value.required === undefined
        ? { arrayItemType: "object" }
        : undefined;
    }
    const nestedTypeName = existingField?.objectSchema?.typeName
      ?? `${parentTypeName}${nestedTypeSegment(name)}`;
    const objectSchema = apiResponseSchemaFromJsonSchemaObject(
      nestedTypeName,
      value,
      existingField?.objectSchema,
    );
    return objectSchema ? { arrayItemType: "object", objectSchema } : undefined;
  }
  if (
    value.type === "string"
    || value.type === "number"
    || value.type === "boolean"
    || value.type === "null"
  ) {
    return { arrayItemType: value.type };
  }
  return undefined;
}

function apiResponseFieldFromJsonSchema(
  name: string,
  value: unknown,
  parentTypeName: string,
  optional: boolean,
  existingField?: ApiResponseField,
): ApiResponseField | undefined {
  if (!isJsonSchemaObject(value) || !hasOnlyJsonSchemaFieldKeywords(value)) {
    return undefined;
  }

  const type = Object.keys(value).length === 0 || value.type === undefined
    ? "unknown"
    : value.type;
  if (
    value.type === "unknown"
    || type !== "string"
    && type !== "number"
    && type !== "boolean"
    && type !== "object"
    && type !== "array"
    && type !== "null"
    && type !== "unknown"
  ) {
    return undefined;
  }
  const annotations = parseJsonSchemaAnnotations(value, type, existingField);
  if (!annotations) return undefined;

  if (type === "object") {
    if (value.items !== undefined) return undefined;
    if (value.properties === undefined) {
      return existingField?.type === "object"
        && !existingField.objectSchema
        && value.required === undefined
        ? { ...annotations, name, optional, type }
        : undefined;
    }
    const nestedTypeName = existingField?.objectSchema?.typeName
      ?? `${parentTypeName}${nestedTypeSegment(name)}`;
    const objectSchema = apiResponseSchemaFromJsonSchemaObject(
      nestedTypeName,
      {
        type: "object",
        properties: value.properties,
        ...(value.required !== undefined ? { required: value.required } : {}),
      },
      existingField?.objectSchema,
    );
    return objectSchema
      ? { ...annotations, name, objectSchema, optional, type }
      : undefined;
  }
  if (type === "array") {
    if (
      value.items === undefined
      || value.properties !== undefined
      || value.required !== undefined
    ) {
      return undefined;
    }
    const item = apiResponseArrayItemFromJsonSchema(
      name,
      value.items,
      parentTypeName,
      existingField,
    );
    return item
      ? { ...annotations, ...item, name, optional, type }
      : undefined;
  }
  if (
    value.items !== undefined
    || value.properties !== undefined
    || value.required !== undefined
  ) {
    return undefined;
  }
  return { ...annotations, name, optional, type };
}

/**
 * Converts the supported JSON Schema 2020-12 object subset into the persisted
 * API contract model. Unsupported keywords fail closed so authoring never
 * silently drops contract semantics.
 */
export function apiResponseSchemaFromJsonSchema(
  typeName: string,
  value: unknown,
  existingSchema?: ApiResponseSchema,
): ApiResponseSchema | undefined {
  if (!isValidTypeScriptTypeName(typeName) || !isJsonSchemaObject(value)) {
    return undefined;
  }
  const schema = apiResponseSchemaFromJsonSchemaObject(
    typeName,
    value,
    existingSchema,
  );
  if (
    !schema
    || !(existingSchema
      ? isValidPersistedApiResponseSchema(schema)
      : isValidApiResponseSchema(schema))
  ) {
    return undefined;
  }
  return existingSchema
    && apiResponseSchemaSignature(existingSchema) === apiResponseSchemaSignature(schema)
    ? existingSchema
    : schema;
}

function jsonSchemaAnnotationsFromApiResponseField(
  field: ApiResponseField,
): JsonSchemaObject {
  return {
    ...(field.defaultValue ? { default: field.defaultValue } : {}),
    ...(field.description ? { description: field.description } : {}),
    ...(field.enumValues ? { enum: field.enumValues } : {}),
    ...(field.example ? { examples: [field.example] } : {}),
    ...(field.maximum !== undefined ? { maximum: field.maximum } : {}),
    ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}),
    ...(field.minimum !== undefined ? { minimum: field.minimum } : {}),
    ...(field.minLength !== undefined ? { minLength: field.minLength } : {}),
    ...(field.pattern ? { pattern: field.pattern } : {}),
  };
}

function apiResponseFieldToJsonSchema(field: ApiResponseField): JsonSchemaObject {
  const annotations = jsonSchemaAnnotationsFromApiResponseField(field);
  if (field.type === "object" && field.objectSchema) {
    return { ...apiResponseSchemaToJsonSchema(field.objectSchema), ...annotations };
  }
  if (field.type === "array") {
    const items = field.arrayItemType === "object" && field.objectSchema
      ? apiResponseSchemaToJsonSchema(field.objectSchema)
      : field.arrayItemType === "unknown" || !field.arrayItemType
        ? {}
        : { type: field.arrayItemType };
    return { type: "array", items, ...annotations };
  }
  if (field.type === "unknown") return annotations;
  return { type: field.type, ...annotations };
}

/** Returns a standard JSON Schema object for the persisted contract subset. */
export function apiResponseSchemaToJsonSchema(
  schema: ApiResponseSchema,
): JsonSchemaObject {
  const properties = Object.fromEntries(schema.fields.map((field) => (
    [field.name, apiResponseFieldToJsonSchema(field)]
  )));
  const required = schema.fields
    .filter((field) => !field.optional)
    .map((field) => field.name);
  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function nestedTypeSegment(value: string): string {
  const segment = value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join("");
  return segment && !/^[0-9]/.test(segment) ? segment : `Field${segment}`;
}

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

export function apiResponseFieldRequiresObjectSchema(
  field: Pick<ApiResponseField, "arrayItemType" | "type">,
): boolean {
  return (
    field.type === "object"
    || (
      field.type === "array"
      && field.arrayItemType === "object"
    )
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
        ...(field.defaultValue ? { defaultValue: field.defaultValue } : {}),
        ...(field.description ? { description: field.description } : {}),
        ...(field.enumValues ? { enumValues: [...field.enumValues].sort(compareText) } : {}),
        ...(field.example ? { example: field.example } : {}),
        ...(field.maximum !== undefined ? { maximum: field.maximum } : {}),
        ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}),
        ...(field.minimum !== undefined ? { minimum: field.minimum } : {}),
        ...(field.minLength !== undefined ? { minLength: field.minLength } : {}),
        name: field.name,
        ...(field.objectSchema
          ? { objectSchema: canonicalizeApiResponseSchema(field.objectSchema) }
          : {}),
        optional: field.optional,
        ...(field.pattern ? { pattern: field.pattern } : {}),
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
  return areApiResponseSchemasEquivalentWithMemo(
    left,
    right,
    new WeakMap(),
  );
}

type SchemaPairMemo = WeakMap<
  ApiResponseSchema,
  WeakMap<ApiResponseSchema, boolean>
>;

function areApiResponseSchemasEquivalentWithMemo(
  left: ApiResponseSchema,
  right: ApiResponseSchema,
  memo: SchemaPairMemo,
): boolean {
  if (left === right) return true;

  const memoized = memo.get(left)?.get(right);
  if (memoized !== undefined) return memoized;

  const rightFieldsByName = new Map(
    right.fields.map((field) => [field.name, field]),
  );
  let equivalent = (
    left.typeName === right.typeName
    && left.fields.length === right.fields.length
  );

  // Mark the pair provisionally so malformed cyclic runtime values cannot
  // recurse forever. Persisted and authored schemas reject cycles separately.
  const rightMemo = memo.get(left) ?? new WeakMap<ApiResponseSchema, boolean>();
  rightMemo.set(right, true);
  memo.set(left, rightMemo);

  if (equivalent) {
    for (const leftField of left.fields) {
      const rightField = rightFieldsByName.get(leftField.name);
      if (
        !rightField
        || leftField.optional !== rightField.optional
        || leftField.type !== rightField.type
        || leftField.arrayItemType !== rightField.arrayItemType
        || Boolean(leftField.objectSchema)
          !== Boolean(rightField.objectSchema)
        || (
          leftField.objectSchema
          && rightField.objectSchema
          && !areApiResponseSchemasEquivalentWithMemo(
            leftField.objectSchema,
            rightField.objectSchema,
            memo,
          )
        )
      ) {
        equivalent = false;
        break;
      }
    }
  }

  rightMemo.set(right, equivalent);
  return equivalent;
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

  const comparisonMemo: SchemaPairMemo = new WeakMap();

  return [...candidateSchemasByTypeName.entries()].some((
    [typeName, variants],
  ) => {
    const source = variants[0];
    return Boolean(
      source
      && (
        variants.some((variant) => (
          !areApiResponseSchemasEquivalentWithMemo(
            source,
            variant,
            comparisonMemo,
          )
        ))
        || existingSchemas.some((schema) => (
          schema.typeName === typeName
          && !areApiResponseSchemasEquivalentWithMemo(
            source,
            schema,
            comparisonMemo,
          )
        ))
      )
    );
  });
}

export function collectApiResponseSchemas(
  schema: ApiResponseSchema,
): ApiResponseSchema[] {
  const collected: ApiResponseSchema[] = [];
  const visited = new WeakSet<ApiResponseSchema>();
  const pending = [schema];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;

    visited.add(current);
    collected.push(current);
    for (let index = current.fields.length - 1; index >= 0; index -= 1) {
      const objectSchema = current.fields[index]?.objectSchema;
      if (objectSchema) pending.push(objectSchema);
    }
  }

  return collected;
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

  return !hasIncompatibleApiResponseSchema([], schema);
}

export function isValidPersistedApiResponseSchema(
  schema: unknown,
): schema is ApiResponseSchema {
  if (!isValidApiResponseSchemaValue(schema, new Set(), true)) return false;

  return !hasIncompatibleApiResponseSchema([], schema);
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

  ancestors.add(schema);
  const propertyNames = new Set<string>();
  let valid = true;

  for (const field of schema.fields) {
    if (!isRecord(field)) {
      valid = false;
      break;
    }

    const typedField = field as Partial<ApiResponseField>;

    if (
      typeof field.name !== "string"
      || typeof field.optional !== "boolean"
      || !isApiResponseFieldType(field.type)
      || !field.name
      || propertyNames.has(field.name)
      || (
        field.type === "array"
        && !isApiResponseArrayItemType(field.arrayItemType)
      )
      || (
        field.type !== "array"
        && field.arrayItemType !== undefined
      )
      || (field.defaultValue !== undefined
        && (typeof field.defaultValue !== "string" || !field.defaultValue.trim()))
      || (field.description !== undefined
        && (typeof field.description !== "string" || !field.description.trim()))
      || (field.example !== undefined
        && (typeof field.example !== "string" || !field.example.trim()))
      || (field.pattern !== undefined
        && (typeof field.pattern !== "string" || !field.pattern.trim()))
      || (field.enumValues !== undefined && (
        !Array.isArray(field.enumValues)
        || field.enumValues.length === 0
        || field.enumValues.some((item) => typeof item !== "string" || !item.trim())
      ))
      || (typedField.minimum !== undefined && !Number.isFinite(typedField.minimum))
      || (typedField.maximum !== undefined && !Number.isFinite(typedField.maximum))
      || (typedField.minLength !== undefined && (
        !Number.isSafeInteger(typedField.minLength) || typedField.minLength < 0
      ))
      || (typedField.maxLength !== undefined && (
        !Number.isSafeInteger(typedField.maxLength) || typedField.maxLength < 0
      ))
      || (typedField.minimum !== undefined && typedField.maximum !== undefined
        && typedField.minimum > typedField.maximum)
      || (typedField.minLength !== undefined && typedField.maxLength !== undefined
        && typedField.minLength > typedField.maxLength)
      || ((typedField.minimum !== undefined || typedField.maximum !== undefined)
        && field.type !== "number")
      || ((typedField.minLength !== undefined || typedField.maxLength !== undefined
        || field.pattern !== undefined) && field.type !== "string")
    ) {
      valid = false;
      break;
    }

    const completeField = field as ApiResponseField;
    const requiresObjectSchema =
      apiResponseFieldRequiresObjectSchema(completeField);
    if (
      (
        requiresObjectSchema
        && completeField.objectSchema === undefined
        && !allowLegacyOpaqueObject
      )
      || (
        requiresObjectSchema
        && completeField.objectSchema !== undefined
        && !isValidApiResponseSchemaValue(
          completeField.objectSchema,
          ancestors,
          allowLegacyOpaqueObject,
        )
      )
      || (
        !requiresObjectSchema
        && completeField.objectSchema !== undefined
      )
    ) {
      valid = false;
      break;
    }

    propertyNames.add(field.name);
  }

  ancestors.delete(schema);
  return valid;
}
