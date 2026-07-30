"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  apiResponseArrayItemTypes,
  apiResponseFieldTypes,
  areApiResponseSchemasEquivalent,
  collectApiResponseSchemas,
  hasIncompatibleApiResponseSchema,
  isValidTypeScriptTypeName,
  isValidApiResponseSchema,
  type ApiResponseArrayItemType,
  type ApiResponseFieldType,
  type ApiResponseSchema,
  typeScriptIdentifierPattern,
} from "@/domain/site/api-response-schema";
import type {
  ApiRouteContract,
  HttpMethod,
} from "@/domain/site/api-route";
import type { ResponseSchemaEditorContent } from "@/domain/site/content";
import { ApiRouteInputBar } from "./api-route-input-bar";
import type { BracedPathValidationReason } from "./braced-path-input";
import { TextInput } from "./form/text-input";
import { IconButton } from "./icon-button";
import { CloseIcon } from "./icons/close-icon";
import { OptionalIcon } from "./icons/optional-icon";
import { PlusIcon } from "./icons/plus-icon";
import { SelectMenu, type SelectMenuOption } from "./select-menu";
import { ToggleList, ToggleListItem } from "./toggle-list";
import { VisuallyHidden } from "./visually-hidden";
import styles from "./response-schema-editor.module.css";

type ResponseSchemaEditorProps = {
  content: ResponseSchemaEditorContent;
  disabledRouteMethods?: readonly HttpMethod[];
  existingResponseSchemas: readonly ApiResponseSchema[];
  formId: string;
  getRouteValidationReason: (
    method: HttpMethod,
    path: string,
  ) => BracedPathValidationReason | null;
  initialSchema?: ApiResponseSchema;
  onRouteMethodChange: (method: HttpMethod) => void;
  onSave: (
    schema: ApiResponseSchema,
    route: Pick<ApiRouteContract, "method" | "path">,
  ) => boolean;
  route: ApiRouteContract;
  routeInputContent: {
    duplicatePathError: string;
    invalidPathError: string;
    label: string;
    methodSelectorLabel: string;
    pathPrefixHint: string;
    placeholder: string;
  };
};

type DraftField = {
  arrayItemType: ApiResponseArrayItemType;
  id: number;
  name: string;
  objectSchema?: DraftObjectSchema;
  optional: boolean;
  type: ApiResponseFieldType;
};

type DraftObjectSchema = {
  fields: DraftField[];
  selectedTemplateTypeName: string;
};

function countSchemaFields(
  schemaFields: Readonly<ApiResponseSchema["fields"]>,
): number {
  return schemaFields.reduce((count, field) => (
    count
    + 1
    + (
      field.objectSchema
        ? countSchemaFields(field.objectSchema.fields)
        : 0
    )
  ), 0);
}

function createInitialDraftFields(
  schemaFields: Readonly<ApiResponseSchema["fields"]>,
) {
  let nextId = 0;

  function createFields(
    currentFields: Readonly<ApiResponseSchema["fields"]>,
  ): DraftField[] {
    return currentFields.map((field) => {
      const id = nextId;
      nextId += 1;

      return {
        arrayItemType: field.type === "array"
          ? (field.arrayItemType ?? "string")
          : "string",
        id,
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
        type: field.type,
      };
    });
  }

  return createFields(schemaFields);
}

function requiresObjectSchema(field: Pick<
  DraftField,
  "arrayItemType" | "type"
>): boolean {
  return (
    field.type === "object"
    || (
      field.type === "array"
      && field.arrayItemType === "object"
    )
  );
}

function draftSchemaToApiResponseSchema(
  typeName: string,
  fields: readonly DraftField[],
  objectPath: readonly string[] = [],
): ApiResponseSchema {
  return {
    fields: fields.map((field) => ({
      ...(field.type === "array"
        ? { arrayItemType: field.arrayItemType }
        : {}),
      name: field.name.trim(),
      ...(requiresObjectSchema(field) && field.objectSchema
        ? {
          objectSchema: draftSchemaToApiResponseSchema(
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

function updateFieldsAtSchemaPath(
  fields: readonly DraftField[],
  schemaPath: readonly number[],
  update: (fields: readonly DraftField[]) => DraftField[],
): DraftField[] {
  const [objectFieldId, ...nestedPath] = schemaPath;
  if (objectFieldId === undefined) return update(fields);

  return fields.map((field) => {
    if (field.id !== objectFieldId || !field.objectSchema) return field;

    return {
      ...field,
      objectSchema: {
        ...field.objectSchema,
        fields: updateFieldsAtSchemaPath(
          field.objectSchema.fields,
          nestedPath,
          update,
        ),
      },
    };
  });
}

function flattenDraftFields(fields: readonly DraftField[]): DraftField[] {
  return fields.flatMap((field) => [
    field,
    ...(field.objectSchema
      ? flattenDraftFields(field.objectSchema.fields)
      : []),
  ]);
}

function duplicateDraftFieldIds(fields: readonly DraftField[]): Set<number> {
  const duplicates = new Set<number>();

  function collect(schemaFields: readonly DraftField[]) {
    const fieldsByName = new Map<string, DraftField[]>();

    for (const field of schemaFields) {
      const name = field.name.trim();
      if (name) {
        const matches = fieldsByName.get(name) ?? [];
        matches.push(field);
        fieldsByName.set(name, matches);
      }
      if (field.objectSchema) collect(field.objectSchema.fields);
    }

    for (const matches of fieldsByName.values()) {
      if (matches.length > 1) {
        for (const field of matches) duplicates.add(field.id);
      }
    }
  }

  collect(fields);
  return duplicates;
}

function hasDraftSchemaTypeNameConflict(
  typeName: string,
  fields: readonly DraftField[],
  existingSchemas: readonly ApiResponseSchema[],
): boolean {
  const schema = draftSchemaToApiResponseSchema(typeName, fields);
  return (
    isValidApiResponseSchema(schema)
    && existingSchemas.some((existingSchema) => (
      existingSchema.typeName === schema.typeName
      && !areApiResponseSchemasEquivalent(existingSchema, schema)
    ))
  );
}

function detachSelectedObjectTemplatesAtPath(
  fields: DraftField[],
  schemaPath: readonly number[],
): { detachedFieldId: number | null; fields: DraftField[] } {
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

export function ResponseSchemaEditor({
  content,
  disabledRouteMethods = [],
  existingResponseSchemas,
  formId,
  getRouteValidationReason,
  initialSchema,
  onRouteMethodChange,
  onSave,
  route,
  routeInputContent,
}: ResponseSchemaEditorProps) {
  const nextFieldIdRef = useRef(
    countSchemaFields(initialSchema?.fields ?? []),
  );
  const [typeName, setTypeName] = useState(
    initialSchema?.typeName ?? "",
  );
  const [fields, setFields] = useState<DraftField[]>(() => (
    createInitialDraftFields(initialSchema?.fields ?? [])
  ));
  const [selectedTemplateTypeName, setSelectedTemplateTypeName] =
    useState("");
  const [expandedObjectIds, setExpandedObjectIds] =
    useState<Set<number>>(() => new Set());
  const [routeMethod, setRouteMethod] = useState(route.method);
  const [routePath, setRoutePath] = useState(route.path);
  const [error, setError] = useState("");
  const responseTypeHeadingId = useId();
  const responseTypeDescriptionId = useId();
  const propertiesHeadingId = useId();
  const validationErrorId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const responseTypeInputRef = useRef<HTMLInputElement>(null);
  const allExistingResponseSchemas = useMemo(
    () => existingResponseSchemas.flatMap(collectApiResponseSchemas),
    [existingResponseSchemas],
  );
  const reusableResponseSchemas = useMemo(() => {
    const schemasByTypeName = new Map<string, ApiResponseSchema[]>();

    for (const schema of allExistingResponseSchemas) {
      const schemas = schemasByTypeName.get(schema.typeName) ?? [];
      schemas.push(schema);
      schemasByTypeName.set(schema.typeName, schemas);
    }

    return [...schemasByTypeName]
      .flatMap(([, schemas]) => {
        const sourceSchema = schemas[0];
        if (
          !sourceSchema
          || schemas.some((schema) => (
            !areApiResponseSchemasEquivalent(sourceSchema, schema)
          ))
        ) {
          return [];
        }
        return [sourceSchema];
      })
      .sort((left, right) => (
        left.typeName < right.typeName
          ? -1
          : left.typeName > right.typeName
            ? 1
            : 0
      ));
  }, [allExistingResponseSchemas]);
  const normalizedTypeName = typeName.trim();
  const draftSchema = useMemo<ApiResponseSchema>(
    () => draftSchemaToApiResponseSchema(normalizedTypeName, fields),
    [fields, normalizedTypeName],
  );
  const isDraftSchemaValid = isValidApiResponseSchema(draftSchema);
  const allDraftFields = useMemo(
    () => flattenDraftFields(fields),
    [fields],
  );
  const hasInvalidTypeName = (
    normalizedTypeName.length > 0
    && !isValidTypeScriptTypeName(normalizedTypeName)
  );
  const invalidPropertyNameIds = useMemo(() => new Set(
    allDraftFields.flatMap((field) => {
      const name = field.name.trim();
      return (
        name.length > 0
        && !typeScriptIdentifierPattern.test(name)
      ) ? [field.id] : [];
    }),
  ), [allDraftFields]);
  const duplicatePropertyNameIds = useMemo(
    () => duplicateDraftFieldIds(fields),
    [fields],
  );
  const hasResponseTypeConflict = (
    isDraftSchemaValid
    && hasIncompatibleApiResponseSchema(
      existingResponseSchemas,
      draftSchema,
    )
  );
  const hasResponseSchemaConflict = (
    hasResponseTypeConflict
    || error === content.responseTypeConflictError
  );
  const visibleValidationError = duplicatePropertyNameIds.size > 0
    ? content.duplicatePropertyError
    : (
        (
          hasInvalidTypeName
          || invalidPropertyNameIds.size > 0
          || hasResponseSchemaConflict
        )
          ? (
              hasResponseSchemaConflict
                ? content.responseTypeConflictError
                : content.identifierHint
            )
          : error
  );

  useLayoutEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const responseTypeInput = form.elements.namedItem("responseType");
    if (responseTypeInput instanceof HTMLInputElement) {
      responseTypeInput.setCustomValidity(
        hasInvalidTypeName
          ? content.identifierHint
          : hasResponseSchemaConflict
            ? content.responseTypeConflictError
            : !isDraftSchemaValid
              ? content.incompleteSchemaError
            : "",
      );
    }

    for (const field of allDraftFields) {
      const input = form.elements.namedItem(`property-${field.id}-name`);
      if (input instanceof HTMLInputElement) {
        input.setCustomValidity(
          duplicatePropertyNameIds.has(field.id)
            ? content.duplicatePropertyError
            : invalidPropertyNameIds.has(field.id)
              ? content.identifierHint
              : "",
        );
      }
    }
  }, [
    allDraftFields,
    content.duplicatePropertyError,
    content.identifierHint,
    content.incompleteSchemaError,
    content.responseTypeConflictError,
    duplicatePropertyNameIds,
    hasInvalidTypeName,
    hasResponseSchemaConflict,
    isDraftSchemaValid,
    invalidPropertyNameIds,
  ]);

  function clearValidationError() {
    setError("");
  }

  function createDraftFields(
    schemaFields: Readonly<ApiResponseSchema["fields"]>,
  ): DraftField[] {
    return schemaFields.map((field) => {
      const id = nextFieldIdRef.current;
      nextFieldIdRef.current += 1;

      return {
        arrayItemType: field.type === "array"
          ? (field.arrayItemType ?? "string")
          : "string",
        id,
        name: field.name,
        ...(field.objectSchema
          ? {
              objectSchema: {
                fields: createDraftFields(field.objectSchema.fields),
                selectedTemplateTypeName: field.objectSchema.typeName,
              },
            }
          : {}),
        optional: field.optional,
        type: field.type,
      };
    });
  }

  function createDraftObjectSchema(
    schema?: ApiResponseSchema,
  ): DraftObjectSchema {
    return {
      fields: createDraftFields(schema?.fields ?? []),
      selectedTemplateTypeName: schema?.typeName ?? "",
    };
  }

  function prefillResponseType(schema?: ApiResponseSchema) {
    setExpandedObjectIds(new Set());
    setSelectedTemplateTypeName(schema?.typeName ?? "");
    setTypeName(schema?.typeName ?? "");
    setFields(createDraftFields(schema?.fields ?? []));
    clearValidationError();
  }

  function commitFields(
    nextFields: DraftField[],
    editedSchemaPath: readonly number[],
  ) {
    const detachedResult = detachSelectedObjectTemplatesAtPath(
      nextFields,
      editedSchemaPath,
    );
    const mustDetachResponseTypeTemplate = (
      selectedTemplateTypeName.length > 0
      || hasDraftSchemaTypeNameConflict(
        typeName,
        detachedResult.fields,
        allExistingResponseSchemas,
      )
    );

    setFields(detachedResult.fields);
    setError(
      mustDetachResponseTypeTemplate
        ? content.responseTypeConflictError
        : "",
    );
    if (mustDetachResponseTypeTemplate) {
      setSelectedTemplateTypeName("");
    }

  }

  function addProperty(schemaPath: readonly number[] = []) {
    const id = nextFieldIdRef.current;
    nextFieldIdRef.current += 1;
    commitFields(
      updateFieldsAtSchemaPath(
        fields,
        schemaPath,
        (schemaFields) => [
          ...schemaFields,
          {
            arrayItemType: "string",
            id,
            name: "",
            optional: false,
            type: "string",
          },
        ],
      ),
      schemaPath,
    );
  }

  function updateProperty(
    schemaPath: readonly number[],
    id: number,
    patch: Partial<DraftField>,
  ) {
    commitFields(
      updateFieldsAtSchemaPath(
        fields,
        schemaPath,
        (schemaFields) => schemaFields.map((field) => (
          field.id === id ? { ...field, ...patch } : field
        )),
      ),
      schemaPath,
    );
  }

  function removeProperty(
    schemaPath: readonly number[],
    id: number,
  ) {
    commitFields(
      updateFieldsAtSchemaPath(
        fields,
        schemaPath,
        (schemaFields) => (
          schemaFields.filter((field) => field.id !== id)
        ),
      ),
      schemaPath,
    );
  }

  function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (duplicatePropertyNameIds.size > 0) {
      setError(content.duplicatePropertyError);
      return;
    }

    if (!isDraftSchemaValid) {
      setError(content.incompleteSchemaError);
      return;
    }

    if (
      hasIncompatibleApiResponseSchema(
        existingResponseSchemas,
        draftSchema,
      )
    ) {
      setSelectedTemplateTypeName("");
      setTypeName("");
      setError("");
      responseTypeInputRef.current?.focus();
      return;
    }

    if (!onSave(draftSchema, {
      method: routeMethod,
      path: routePath,
    })) {
      setSelectedTemplateTypeName("");
      setTypeName("");
      setError("");
      responseTypeInputRef.current?.focus();
    }
  }

  function setObjectExpanded(
    fieldId: number,
    expanded: boolean,
  ) {
    setExpandedObjectIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (expanded) {
        nextIds.add(fieldId);
      } else {
        nextIds.delete(fieldId);
      }
      return nextIds;
    });
  }

  function selectPropertyType(
    schemaPath: readonly number[],
    field: DraftField,
    type: ApiResponseFieldType,
  ) {
    const arrayItemType = type === "array"
      ? (field.type === "array" ? field.arrayItemType : "string")
      : field.arrayItemType;
    const needsObjectSchema = (
      type === "object"
      || (type === "array" && arrayItemType === "object")
    );

    updateProperty(schemaPath, field.id, {
      arrayItemType,
      objectSchema: needsObjectSchema
        ? (field.objectSchema ?? createDraftObjectSchema())
        : undefined,
      type,
    });
    setObjectExpanded(field.id, needsObjectSchema);
  }

  function selectArrayItemType(
    schemaPath: readonly number[],
    field: DraftField,
    arrayItemType: ApiResponseArrayItemType,
  ) {
    const needsObjectSchema = arrayItemType === "object";

    updateProperty(schemaPath, field.id, {
      arrayItemType,
      objectSchema: needsObjectSchema
        ? (field.objectSchema ?? createDraftObjectSchema())
        : undefined,
    });
    setObjectExpanded(field.id, needsObjectSchema);
  }

  function renderPropertyFields(
    schemaFields: readonly DraftField[],
    schemaPath: readonly number[],
  ) {
    return (
      <ToggleList
        aria-label={content.propertiesLabel}
        className={styles.propertyList}
      >
        {schemaFields.map((field, index) => {
          const nestedSchemaPath = [...schemaPath, field.id];
          const objectSchemaRequired = requiresObjectSchema(field);

          return (
            <ToggleListItem
              key={field.id}
              className={styles.propertyCard}
              expanded={expandedObjectIds.has(field.id)}
              headerClassName={[
                styles.propertyGrid,
                field.type === "array" ? styles.propertyGridArray : "",
              ].filter(Boolean).join(" ")}
              onExpandedChange={(expanded) => {
                setObjectExpanded(field.id, expanded);
              }}
              panelClassName={styles.objectDefinition}
              toggleLabel={`${content.objectDefinitionLabel}: ${
                field.name || content.propertyNamePlaceholder
              }`}
              summary={(
                <>
                  <VisuallyHidden>
                    {content.propertiesLabel} {index + 1}
                  </VisuallyHidden>
                  <div
                    className={`${styles.fieldGroup} ${styles.propertyNameField}`}
                  >
                    <TextInput
                      tone="nested"
                      name={`property-${field.id}-name`}
                      aria-label={content.propertyNameLabel}
                      autoComplete="off"
                      spellCheck={false}
                      required
                      aria-invalid={
                        (
                          duplicatePropertyNameIds.has(field.id)
                          || invalidPropertyNameIds.has(field.id)
                        )
                          ? true
                          : undefined
                      }
                      aria-describedby={
                        (
                          duplicatePropertyNameIds.has(field.id)
                          || invalidPropertyNameIds.has(field.id)
                        )
                          ? validationErrorId
                          : undefined
                      }
                      pattern={typeScriptIdentifierPattern.source}
                      title={content.identifierHint}
                      placeholder={content.propertyNamePlaceholder}
                      trailingControl={(
                        <IconButton
                          className={styles.optionalToggle}
                          aria-label={content.optionalLabel}
                          aria-pressed={field.optional}
                          title={content.optionalLabel}
                          onClick={() => {
                            updateProperty(schemaPath, field.id, {
                              optional: !field.optional,
                            });
                          }}
                        >
                          <OptionalIcon />
                        </IconButton>
                      )}
                      value={field.name}
                      onChange={(event) => {
                        updateProperty(schemaPath, field.id, {
                          name: event.currentTarget.value,
                        });
                      }}
                    />
                  </div>

                  <div
                    className={styles.typeExpression}
                    data-is-array={field.type === "array"}
                  >
                    <SelectMenu
                      height="large"
                      label={content.propertyTypeLabel}
                      menuPlacement="top"
                      options={apiResponseFieldTypes.map((type) => ({
                        id: type,
                        kind: "action",
                        label: content.typeOptions[type],
                        onSelect: () => selectPropertyType(
                          schemaPath,
                          field,
                          type,
                        ),
                      } satisfies SelectMenuOption))}
                      rounded
                      selectedId={field.type}
                      width="field"
                    />
                    {field.type === "array" ? (
                      <>
                        <span
                          className={styles.arrayConnector}
                          aria-hidden="true"
                        >
                          {content.arrayConnectorLabel}
                        </span>
                        <SelectMenu
                          height="large"
                          label={content.arrayItemTypeLabel}
                          menuPlacement="top"
                          options={apiResponseArrayItemTypes.map((type) => ({
                            id: type,
                            kind: "action",
                            label: content.typeOptions[type],
                            onSelect: () => selectArrayItemType(
                              schemaPath,
                              field,
                              type,
                            ),
                          } satisfies SelectMenuOption))}
                          rounded
                          selectedId={field.arrayItemType}
                          width="field"
                        />
                      </>
                    ) : null}
                  </div>

                </>
              )}
              actions={(
                <div className={styles.propertyActions}>
                  {objectSchemaRequired && field.objectSchema ? (
                    <IconButton
                      type="button"
                      className={styles.addProperty}
                      aria-label={content.addPropertyLabel}
                      onClick={() => addProperty(nestedSchemaPath)}
                    >
                      <PlusIcon />
                    </IconButton>
                  ) : null}
                  <IconButton
                    type="button"
                    className={styles.removeProperty}
                    aria-label={`${content.removePropertyLabel} ${index + 1}`}
                    onClick={() => removeProperty(schemaPath, field.id)}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              )}
            >
              {objectSchemaRequired && field.objectSchema ? (
                <>
                  {reusableResponseSchemas.length > 0 ? (
                    <div className={styles.objectTemplateControl}>
                      <SelectMenu
                        height="large"
                        label={content.objectTypeTemplateLabel}
                        menuPlacement="top"
                        options={[
                          {
                            id: "",
                            kind: "action",
                            label: content.newResponseTypeLabel,
                            onSelect: () => {
                              updateProperty(
                                schemaPath,
                                field.id,
                                {
                                  objectSchema:
                                    createDraftObjectSchema(),
                                },
                              );
                            },
                          },
                          ...reusableResponseSchemas.map((schema) => ({
                            id: schema.typeName,
                            kind: "action" as const,
                            label: schema.typeName,
                            onSelect: () => {
                              updateProperty(
                                schemaPath,
                                field.id,
                                {
                                  objectSchema:
                                    createDraftObjectSchema(schema),
                                },
                              );
                            },
                          })),
                        ]}
                        rounded
                        selectedId={
                          field.objectSchema.selectedTemplateTypeName
                        }
                        width="field"
                      />
                    </div>
                  ) : null}
                  {field.objectSchema.fields.length > 0 ? (
                    <div
                      className={styles.objectProperties}
                      data-nested-properties="true"
                    >
                      {renderPropertyFields(
                        field.objectSchema.fields,
                        nestedSchemaPath,
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}
            </ToggleListItem>
          );
        })}
      </ToggleList>
    );
  }

  return (
    <form
      ref={formRef}
      id={formId}
      className={styles.form}
      onSubmit={submitResponse}
    >
      <ApiRouteInputBar
        className={styles.overlayRouteInput}
        disabledMethods={disabledRouteMethods}
        getValidationReason={getRouteValidationReason}
        initialPath={route.path}
        label={routeInputContent.label}
        layout="split"
        method={routeMethod}
        methodSelectorLabel={routeInputContent.methodSelectorLabel}
        onMethodChange={(nextMethod) => {
          setRouteMethod(nextMethod);
          onRouteMethodChange(nextMethod);
        }}
        onPathChange={setRoutePath}
        placeholder={routeInputContent.placeholder}
        preferredInitialFocus="response"
        prefixHint={routeInputContent.pathPrefixHint}
        required
        tone="nested"
        validationMessages={{
          duplicate: routeInputContent.duplicatePathError,
          syntax: routeInputContent.invalidPathError,
        }}
      />

      <section
            className={styles.section}
            aria-labelledby={responseTypeHeadingId}
          >
            <div className={styles.sectionHeader}>
              <h3
                id={responseTypeHeadingId}
                className={styles.sectionTitle}
              >
                {content.responseTypeLabel}
              </h3>
              <p
                id={responseTypeDescriptionId}
                className={styles.sectionDescription}
              >
                {content.responseTypeDescription}
              </p>
            </div>
            <div
              className={styles.responseTypeControls}
              data-has-template={reusableResponseSchemas.length > 0}
            >
              <TextInput
                ref={responseTypeInputRef}
                data-overlay-initial-focus="true"
                tone="nested"
                name="responseType"
                autoComplete="off"
                spellCheck={false}
                required
                pattern={typeScriptIdentifierPattern.source}
                title={content.identifierHint}
                placeholder={content.responseTypePlaceholder}
                value={typeName}
                aria-labelledby={responseTypeHeadingId}
                aria-invalid={
                  hasInvalidTypeName || hasResponseSchemaConflict
                    ? true
                    : undefined
                }
                aria-describedby={
                  hasInvalidTypeName || hasResponseSchemaConflict
                    ? `${responseTypeDescriptionId} ${validationErrorId}`
                    : responseTypeDescriptionId
                }
                onChange={(event) => {
                  const nextTypeName = event.currentTarget.value;
                  const hasConflict = hasDraftSchemaTypeNameConflict(
                    nextTypeName,
                    fields,
                    allExistingResponseSchemas,
                  );
                  setTypeName(hasConflict ? "" : nextTypeName);
                  if (nextTypeName !== selectedTemplateTypeName) {
                    setSelectedTemplateTypeName("");
                  }
                  clearValidationError();
                }}
              />
              {reusableResponseSchemas.length > 0 ? (
                <SelectMenu
                  height="large"
                  label={content.responseTypeTemplateLabel}
                  options={[
                    {
                      id: "",
                      kind: "action",
                      label: content.newResponseTypeLabel,
                      onSelect: () => prefillResponseType(),
                    },
                    ...reusableResponseSchemas.map((schema) => ({
                      id: schema.typeName,
                      kind: "action" as const,
                      label: schema.typeName,
                      onSelect: () => prefillResponseType(schema),
                    })),
                  ]}
                  rounded
                  selectedId={selectedTemplateTypeName}
                  width="field"
                />
              ) : null}
            </div>
          </section>

          <section
            className={styles.propertiesSection}
            aria-labelledby={propertiesHeadingId}
          >
            <div className={styles.propertiesHeader}>
              <div className={styles.sectionHeader}>
                <h3
                  id={propertiesHeadingId}
                  className={styles.sectionTitle}
                >
                  {content.propertiesLabel}
                </h3>
                <p className={styles.sectionDescription}>
                  {content.propertiesDescription}
                </p>
              </div>
              <IconButton
                type="button"
                className={styles.addProperty}
                aria-label={content.addPropertyLabel}
                onClick={() => addProperty()}
              >
                <PlusIcon />
              </IconButton>
            </div>

            {renderPropertyFields(fields, [])}
      </section>

      {visibleValidationError ? (
        <p
          id={validationErrorId}
          className={styles.error}
          role="alert"
        >
          {visibleValidationError}
        </p>
      ) : null}
    </form>
  );
}
