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

function jsonValueType(value: unknown): ApiResponseFieldType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "object";
  return "unknown";
}

function nestedTypeSegment(value: string): string {
  const segment = value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join("");
  return segment && !/^[0-9]/.test(segment) ? segment : `Field${segment}`;
}

function inferJsonField(
  name: string,
  values: readonly unknown[],
  parentTypeName: string,
  optional: boolean,
): ApiResponseField {
  const valueTypes = new Set(values.map(jsonValueType));
  const type = valueTypes.size === 1
    ? [...valueTypes][0] ?? "unknown"
    : "unknown";
  const nestedTypeName = `${parentTypeName}${nestedTypeSegment(name)}`;

  if (type === "object") {
    const objects = values.filter((value): value is Record<string, unknown> => (
      typeof value === "object" && value !== null && !Array.isArray(value)
    ));
    return {
      name,
      objectSchema: inferJsonObjectSchema(nestedTypeName, objects),
      optional,
      type,
    };
  }

  if (type === "array") {
    const items = values.flatMap((value) => Array.isArray(value) ? value : []);
    const itemTypes = new Set(items.map(jsonValueType));
    const inferredItemType = itemTypes.size === 1
      ? ([...itemTypes][0] ?? "unknown")
      : "unknown";
    const arrayItemType = inferredItemType === "array"
      ? "unknown"
      : inferredItemType;
    const objectItems = arrayItemType === "object"
      ? items.filter((value): value is Record<string, unknown> => (
          typeof value === "object" && value !== null && !Array.isArray(value)
        ))
      : [];
    return {
      arrayItemType,
      name,
      ...(arrayItemType === "object"
        ? { objectSchema: inferJsonObjectSchema(nestedTypeName, objectItems) }
        : {}),
      optional,
      type,
    };
  }

  return { name, optional, type };
}

function inferJsonObjectSchema(
  typeName: string,
  objects: readonly Record<string, unknown>[],
): ApiResponseSchema {
  const propertyNames = [...new Set(objects.flatMap(Object.keys))];
  return {
    fields: propertyNames.map((name) => {
      const values = objects.flatMap((object) => (
        Object.hasOwn(object, name) ? [object[name]] : []
      ));
      return inferJsonField(
        name,
        values,
        typeName,
        values.length < objects.length,
      );
    }),
    typeName,
  };
}

export function inferApiResponseSchemaFromJson(
  typeName: string,
  value: unknown,
): ApiResponseSchema | undefined {
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
    || !isValidTypeScriptTypeName(typeName)
  ) {
    return undefined;
  }
  return inferJsonObjectSchema(typeName, [value as Record<string, unknown>]);
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
