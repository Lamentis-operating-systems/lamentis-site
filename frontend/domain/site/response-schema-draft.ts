import {
  apiResponseFieldRequiresObjectSchema,
  isValidTypeScriptTypeName,
  type ApiResponseArrayItemType,
  type ApiResponseFieldType,
  type ApiResponseSchema,
} from "./api-response-schema";

export type ResponseDraftField = {
  arrayItemType: ApiResponseArrayItemType;
  defaultValue?: string;
  description?: string;
  enumValues?: string[];
  example?: string;
  id: number;
  maximum?: number;
  maxLength?: number;
  minimum?: number;
  minLength?: number;
  name: string;
  objectSchema?: ResponseDraftObjectSchema;
  optional: boolean;
  pattern?: string;
  type: ApiResponseFieldType;
};

export type ResponseDraftObjectSchema = {
  fields: ResponseDraftField[];
  selectedTemplateTypeName: string;
};

type ResponseSchemaDraftIssue =
  | "duplicate-properties"
  | "incomplete-schema"
  | null;

export type ResponseSchemaDraftState = {
  fields: ResponseDraftField[];
  issue: ResponseSchemaDraftIssue;
  selectedTemplateTypeName: string;
  typeName: string;
};

export type ResponseSchemaDraftAction =
  | {
      fields: ResponseDraftField[];
      selectedTemplateTypeName: string;
      type: "prefill";
      typeName: string;
    }
  | {
      editedSchemaPath: readonly number[];
      fields: ResponseDraftField[];
      type: "commit-fields";
    }
  | {
      issue: ResponseSchemaDraftIssue;
      type: "set-issue";
    }
  | {
      type: "set-type-name";
      typeName: string;
    }
  | {
      type: "reject-schema-conflict";
    };

export function responseSchemaDraftReducer(
  state: ResponseSchemaDraftState,
  action: ResponseSchemaDraftAction,
): ResponseSchemaDraftState {
  switch (action.type) {
    case "prefill":
      return {
        fields: action.fields,
        issue: null,
        selectedTemplateTypeName: action.selectedTemplateTypeName,
        typeName: action.typeName,
      };
    case "commit-fields": {
      const detached = detachSelectedObjectTemplatesAtPath(
        action.fields,
        action.editedSchemaPath,
      );
      const responseTemplateWasEdited =
        state.selectedTemplateTypeName.length > 0;

      return {
        ...state,
        fields: detached.fields,
        issue: null,
        selectedTemplateTypeName: responseTemplateWasEdited
          ? ""
          : state.selectedTemplateTypeName,
      };
    }
    case "set-issue":
      return { ...state, issue: action.issue };
    case "set-type-name":
      return {
        ...state,
        issue: null,
        selectedTemplateTypeName: (
          action.typeName === state.selectedTemplateTypeName
            ? state.selectedTemplateTypeName
            : ""
        ),
        typeName: action.typeName,
      };
    case "reject-schema-conflict":
      return {
        ...state,
        issue: null,
        selectedTemplateTypeName: "",
        typeName: "",
      };
  }
}

export function createResponseDraftFields(
  schemaFields: Readonly<ApiResponseSchema["fields"]>,
  firstId = 0,
): { fields: ResponseDraftField[]; nextId: number } {
  let nextId = firstId;

  function createFields(
    currentFields: Readonly<ApiResponseSchema["fields"]>,
  ): ResponseDraftField[] {
    return currentFields.map((field) => {
      const id = nextId;
      nextId += 1;

      return {
        arrayItemType: field.type === "array"
          ? (field.arrayItemType ?? "string")
          : "string",
        ...(field.defaultValue ? { defaultValue: field.defaultValue } : {}),
        ...(field.description ? { description: field.description } : {}),
        ...(field.enumValues ? { enumValues: [...field.enumValues] } : {}),
        ...(field.example ? { example: field.example } : {}),
        id,
        ...(field.maximum !== undefined ? { maximum: field.maximum } : {}),
        ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}),
        ...(field.minimum !== undefined ? { minimum: field.minimum } : {}),
        ...(field.minLength !== undefined ? { minLength: field.minLength } : {}),
        name: field.name,
        ...(field.objectSchema
          ? {
              objectSchema: {
                fields: createFields(field.objectSchema.fields),
                selectedTemplateTypeName: field.objectSchema.typeName,
              },
            }
          : {}),
        optional: field.optional,
        ...(field.pattern ? { pattern: field.pattern } : {}),
        type: field.type,
      };
    });
  }

  return { fields: createFields(schemaFields), nextId };
}

export function draftFieldsToApiResponseSchema(
  typeName: string,
  fields: readonly ResponseDraftField[],
  objectPath: readonly string[] = [],
): ApiResponseSchema {
  return {
    fields: fields.map((field) => ({
      ...(field.type === "array"
        ? { arrayItemType: field.arrayItemType }
        : {}),
      ...(field.defaultValue?.trim()
        ? { defaultValue: field.defaultValue.trim() }
        : {}),
      ...(field.description?.trim()
        ? { description: field.description.trim() }
        : {}),
      ...(field.enumValues && field.enumValues.length > 0
        ? { enumValues: field.enumValues }
        : {}),
      ...(field.example?.trim() ? { example: field.example.trim() } : {}),
      ...(field.maximum !== undefined ? { maximum: field.maximum } : {}),
      ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}),
      ...(field.minimum !== undefined ? { minimum: field.minimum } : {}),
      ...(field.minLength !== undefined ? { minLength: field.minLength } : {}),
      name: field.name.trim(),
      ...(apiResponseFieldRequiresObjectSchema(field) && field.objectSchema
        ? {
            objectSchema: draftFieldsToApiResponseSchema(
              deriveObjectTypeName(
                typeName,
                [...objectPath, field.name.trim()],
              ),
              field.objectSchema.fields,
              [...objectPath, field.name.trim()],
            ),
          }
        : {}),
      optional: field.optional,
      ...(field.pattern?.trim() ? { pattern: field.pattern.trim() } : {}),
      type: field.type,
    })),
    typeName: typeName.trim(),
  };
}

function deriveObjectTypeName(
  responseTypeName: string,
  objectPath: readonly string[],
): string {
  const responsePrefix = isValidTypeScriptTypeName(responseTypeName)
    ? responseTypeName
    : "Response";
  const pathSuffix = objectPath
    .flatMap((segment) => segment.split(/[^A-Za-z0-9]+/))
    .filter(Boolean)
    .map((segment) => (
      `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
    ))
    .join("");

  return `${responsePrefix}${pathSuffix || "Object"}`;
}

export function updateDraftFieldsAtSchemaPath(
  fields: readonly ResponseDraftField[],
  schemaPath: readonly number[],
  update: (
    fields: readonly ResponseDraftField[],
  ) => ResponseDraftField[],
): ResponseDraftField[] {
  const [objectFieldId, ...nestedPath] = schemaPath;
  if (objectFieldId === undefined) return update(fields);

  return fields.map((field) => {
    if (field.id !== objectFieldId || !field.objectSchema) return field;

    return {
      ...field,
      objectSchema: {
        ...field.objectSchema,
        fields: updateDraftFieldsAtSchemaPath(
          field.objectSchema.fields,
          nestedPath,
          update,
        ),
      },
    };
  });
}

export function flattenResponseDraftFields(
  fields: readonly ResponseDraftField[],
): ResponseDraftField[] {
  const flattened: ResponseDraftField[] = [];
  const pending = [...fields].reverse();

  while (pending.length > 0) {
    const field = pending.pop();
    if (!field) continue;

    flattened.push(field);
    if (field.objectSchema) {
      pending.push(...[...field.objectSchema.fields].reverse());
    }
  }

  return flattened;
}

export function duplicateResponseDraftFieldIds(
  fields: readonly ResponseDraftField[],
): Set<number> {
  const duplicates = new Set<number>();
  const pending = [fields];

  while (pending.length > 0) {
    const schemaFields = pending.pop();
    if (!schemaFields) continue;

    const fieldsByName = new Map<string, ResponseDraftField[]>();
    for (const field of schemaFields) {
      const name = field.name.trim();
      if (name) {
        const matches = fieldsByName.get(name) ?? [];
        matches.push(field);
        fieldsByName.set(name, matches);
      }
      if (field.objectSchema) pending.push(field.objectSchema.fields);
    }

    for (const matches of fieldsByName.values()) {
      if (matches.length > 1) {
        for (const field of matches) duplicates.add(field.id);
      }
    }
  }

  return duplicates;
}

function detachSelectedObjectTemplatesAtPath(
  fields: ResponseDraftField[],
  schemaPath: readonly number[],
): { detachedFieldId: number | null; fields: ResponseDraftField[] } {
  const [objectFieldId, ...nestedPath] = schemaPath;
  if (objectFieldId === undefined) {
    return { detachedFieldId: null, fields };
  }

  let detachedFieldId: number | null = null;
  const nextFields = fields.map((field) => {
    if (field.id !== objectFieldId || !field.objectSchema) return field;

    const nestedResult = detachSelectedObjectTemplatesAtPath(
      field.objectSchema.fields,
      nestedPath,
    );
    const shouldDetach = (
      field.objectSchema.selectedTemplateTypeName.length > 0
    );
    if (!shouldDetach && nestedResult.fields === field.objectSchema.fields) {
      return field;
    }
    if (shouldDetach) detachedFieldId = field.id;
    detachedFieldId ??= nestedResult.detachedFieldId;

    return {
      ...field,
      objectSchema: {
        ...field.objectSchema,
        fields: nestedResult.fields,
        ...(shouldDetach
          ? { selectedTemplateTypeName: "" }
          : {}),
      },
    };
  });

  return { detachedFieldId, fields: nextFields };
}
