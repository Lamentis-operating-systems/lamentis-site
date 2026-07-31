"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  apiResponseArrayItemTypes,
  apiResponseFieldRequiresObjectSchema,
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
import type {
  ApiRouteWorkspaceSaveResult,
} from "@/domain/site/api-route-workspace";
import type { ResponseSchemaEditorContent } from "@/domain/site/content";
import {
  createResponseDraftFields,
  draftFieldsToApiResponseSchema,
  duplicateResponseDraftFieldIds,
  flattenResponseDraftFields,
  responseSchemaDraftReducer,
  updateDraftFieldsAtSchemaPath,
  type ResponseDraftField,
  type ResponseDraftObjectSchema,
} from "@/domain/site/response-schema-draft";
import { ApiRouteInputBar } from "./api-route-input-bar";
import type { BracedPathValidationReason } from "./braced-path-input";
import { TextInput } from "./form/text-input";
import { IconButton } from "./icon-button";
import { CloseIcon } from "./icons/close-icon";
import { OptionalIcon } from "./icons/optional-icon";
import { PlusIcon } from "./icons/plus-icon";
import { SelectMenu, type SelectMenuOption } from "./select-menu";
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
  onRouteMethodChange?: (method: HttpMethod) => void;
  onSave: (
    schema: ApiResponseSchema,
    route: Pick<ApiRouteContract, "method" | "path">,
  ) => ApiRouteWorkspaceSaveResult;
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

type PendingPropertyFocus =
  | { fieldId: number; kind: "field" }
  | { kind: "add"; schemaPathKey: string };

function schemaPathKey(schemaPath: readonly number[]): string {
  return schemaPath.length > 0 ? schemaPath.join(".") : "root";
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
  const [initialDraft] = useState(() => (
    createResponseDraftFields(initialSchema?.fields ?? [])
  ));
  const nextFieldIdRef = useRef(initialDraft.nextId);
  const [draft, dispatchDraft] = useReducer(
    responseSchemaDraftReducer,
    {
      fields: initialDraft.fields,
      issue: null,
      selectedTemplateTypeName: "",
      typeName: initialSchema?.typeName ?? "",
    },
  );
  const {
    fields,
    issue,
    selectedTemplateTypeName,
    typeName,
  } = draft;
  const [routeMethod, setRouteMethod] = useState(route.method);
  const [routePath, setRoutePath] = useState(route.path);
  const [saveFailure, setSaveFailure] = useState<
    "route-conflict" | null
  >(null);
  const responseTypeHeadingId = useId();
  const responseTypeDescriptionId = useId();
  const validationErrorId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const routeInputRef = useRef<HTMLInputElement>(null);
  const responseTypeInputRef = useRef<HTMLInputElement>(null);
  const propertyInputRefs = useRef(new Map<number, HTMLInputElement>());
  const addPropertyButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingPropertyFocusRef = useRef<PendingPropertyFocus | null>(null);
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
    () => draftFieldsToApiResponseSchema(normalizedTypeName, fields),
    [fields, normalizedTypeName],
  );
  const isDraftSchemaValid = isValidApiResponseSchema(draftSchema);
  const allDraftFields = useMemo(
    () => flattenResponseDraftFields(fields),
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
    () => duplicateResponseDraftFieldIds(fields),
    [fields],
  );
  const hasResponseTypeConflict = (
    isDraftSchemaValid
    && hasIncompatibleApiResponseSchema(
      existingResponseSchemas,
      draftSchema,
    )
  );
  const hasResponseSchemaConflict = hasResponseTypeConflict;
  const visibleValidationError = duplicatePropertyNameIds.size > 0
    ? content.duplicatePropertyError
    : hasInvalidTypeName || invalidPropertyNameIds.size > 0
      ? content.identifierHint
      : hasResponseSchemaConflict
        ? content.responseTypeConflictError
        : issue === "incomplete-schema"
          ? content.incompleteSchemaError
          : issue === "duplicate-properties"
            ? content.duplicatePropertyError
            : null;

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

  useLayoutEffect(() => {
    const pendingFocus = pendingPropertyFocusRef.current;
    if (!pendingFocus) return;

    pendingPropertyFocusRef.current = null;
    if (pendingFocus.kind === "field") {
      propertyInputRefs.current.get(pendingFocus.fieldId)?.focus();
    } else {
      addPropertyButtonRefs.current.get(
        pendingFocus.schemaPathKey,
      )?.focus();
    }
  }, [fields]);

  function allocateDraftFields(
    schemaFields: Readonly<ApiResponseSchema["fields"]>,
  ): ResponseDraftField[] {
    const allocated = createResponseDraftFields(
      schemaFields,
      nextFieldIdRef.current,
    );
    nextFieldIdRef.current = allocated.nextId;
    return allocated.fields;
  }

  function createDraftObjectSchema(
    schema?: ApiResponseSchema,
  ): ResponseDraftObjectSchema {
    return {
      fields: allocateDraftFields(schema?.fields ?? []),
      selectedTemplateTypeName: schema?.typeName ?? "",
    };
  }

  function prefillResponseType(schema?: ApiResponseSchema) {
    dispatchDraft({
      fields: allocateDraftFields(schema?.fields ?? []),
      selectedTemplateTypeName: schema?.typeName ?? "",
      type: "prefill",
      typeName: schema?.typeName ?? "",
    });
    setSaveFailure(null);
  }

  function commitFields(
    nextFields: ResponseDraftField[],
    editedSchemaPath: readonly number[],
  ) {
    dispatchDraft({
      editedSchemaPath,
      fields: nextFields,
      type: "commit-fields",
    });
    setSaveFailure(null);
  }

  function addProperty(schemaPath: readonly number[] = []) {
    const id = nextFieldIdRef.current;
    nextFieldIdRef.current += 1;
    pendingPropertyFocusRef.current = { fieldId: id, kind: "field" };
    commitFields(
      updateDraftFieldsAtSchemaPath(
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
    patch: Partial<ResponseDraftField>,
  ) {
    commitFields(
      updateDraftFieldsAtSchemaPath(
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
    siblingFieldId?: number,
  ) {
    pendingPropertyFocusRef.current = siblingFieldId === undefined
      ? { kind: "add", schemaPathKey: schemaPathKey(schemaPath) }
      : { fieldId: siblingFieldId, kind: "field" };
    commitFields(
      updateDraftFieldsAtSchemaPath(
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
      dispatchDraft({
        issue: "duplicate-properties",
        type: "set-issue",
      });
      return;
    }

    if (!isDraftSchemaValid) {
      dispatchDraft({
        issue: "incomplete-schema",
        type: "set-issue",
      });
      return;
    }

    if (
      hasIncompatibleApiResponseSchema(
        existingResponseSchemas,
        draftSchema,
      )
    ) {
      dispatchDraft({ type: "reject-schema-conflict" });
      responseTypeInputRef.current?.focus();
      return;
    }

    const result = onSave(draftSchema, {
      method: routeMethod,
      path: routePath,
    });
    if (result === "schema-conflict") {
      dispatchDraft({ type: "reject-schema-conflict" });
      responseTypeInputRef.current?.focus();
    } else if (result === "route-conflict") {
      setSaveFailure("route-conflict");
      queueMicrotask(() => routeInputRef.current?.focus());
    }
  }

  function selectPropertyType(
    schemaPath: readonly number[],
    field: ResponseDraftField,
    type: ApiResponseFieldType,
  ) {
    const arrayItemType = type === "array"
      ? (field.type === "array" ? field.arrayItemType : "string")
      : field.arrayItemType;
    const needsObjectSchema = apiResponseFieldRequiresObjectSchema({
      arrayItemType,
      type,
    });

    updateProperty(schemaPath, field.id, {
      arrayItemType,
      objectSchema: needsObjectSchema
        ? (field.objectSchema ?? createDraftObjectSchema())
        : undefined,
      type,
    });
  }

  function selectArrayItemType(
    schemaPath: readonly number[],
    field: ResponseDraftField,
    arrayItemType: ApiResponseArrayItemType,
  ) {
    const needsObjectSchema = arrayItemType === "object";

    updateProperty(schemaPath, field.id, {
      arrayItemType,
      objectSchema: needsObjectSchema
        ? (field.objectSchema ?? createDraftObjectSchema())
        : undefined,
    });
  }

  function renderPropertyFields(
    schemaFields: readonly ResponseDraftField[],
    schemaPath: readonly number[],
    positionPath: readonly number[],
    isRoot = false,
  ) {
    const listPosition = positionPath.join(".");

    return (
      <ul
        aria-label={[
          content.propertiesLabel,
          listPosition,
        ].filter(Boolean).join(" ")}
        className={styles.propertyList}
        data-root-properties={isRoot ? true : undefined}
      >
        {schemaFields.map((field, index) => {
          const position = [...positionPath, index + 1];
          const positionLabel = position.join(".");
          const nestedSchemaPath = [...schemaPath, field.id];
          const objectSchemaRequired =
            apiResponseFieldRequiresObjectSchema(field);
          const hasObjectDefinitionContent = Boolean(
            objectSchemaRequired
            && field.objectSchema
            && (
              reusableResponseSchemas.length > 0
              || field.objectSchema.fields.length > 0
            )
          );

          return (
            <li
              key={field.id}
              className={styles.propertyCard}
            >
              <div
                className={[
                  styles.propertyGrid,
                  field.type === "array" ? styles.propertyGridArray : "",
                ].filter(Boolean).join(" ")}
                role="group"
                aria-label={`${content.propertiesLabel} ${positionLabel}`}
              >
                <>
                  <div
                    className={`${styles.fieldGroup} ${styles.propertyNameField}`}
                  >
                    <TextInput
                      ref={(input) => {
                        if (input) {
                          propertyInputRefs.current.set(field.id, input);
                        } else {
                          propertyInputRefs.current.delete(field.id);
                        }
                      }}
                      tone="nested"
                      name={`property-${field.id}-name`}
                      aria-label={
                        `${content.propertyNameLabel} ${positionLabel}`
                      }
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
                          variant="transparent"
                          aria-label={
                            `${content.optionalLabel} ${positionLabel}`
                          }
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
                      label={
                        `${content.propertyTypeLabel} ${positionLabel}`
                      }
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
                          label={
                            `${content.arrayItemTypeLabel} ${positionLabel}`
                          }
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
                <div className={styles.propertyActions}>
                  {objectSchemaRequired && field.objectSchema ? (
                    <IconButton
                      ref={(button) => {
                        const key = schemaPathKey(nestedSchemaPath);
                        if (button) {
                          addPropertyButtonRefs.current.set(key, button);
                        } else {
                          addPropertyButtonRefs.current.delete(key);
                        }
                      }}
                      type="button"
                      className={styles.addProperty}
                      aria-label={
                        `${content.addPropertyLabel} ${positionLabel}`
                      }
                      onClick={() => addProperty(nestedSchemaPath)}
                    >
                      <PlusIcon />
                    </IconButton>
                  ) : null}
                  <IconButton
                    type="button"
                    className={styles.removeProperty}
                    aria-label={
                      `${content.removePropertyLabel} ${positionLabel}`
                    }
                    onClick={() => removeProperty(
                      schemaPath,
                      field.id,
                      schemaFields[index + 1]?.id
                        ?? schemaFields[index - 1]?.id,
                    )}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              </div>
              {hasObjectDefinitionContent && field.objectSchema ? (
                <div className={styles.objectDefinition}>
                  {reusableResponseSchemas.length > 0 ? (
                    <div className={styles.objectTemplateControl}>
                      <SelectMenu
                        height="large"
                        label={
                          `${content.objectTypeTemplateLabel} ${positionLabel}`
                        }
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
                        position,
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
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
        getValidationReason={(method, path) => (
          getRouteValidationReason(method, path)
          ?? (saveFailure === "route-conflict" ? "duplicate" : null)
        )}
        initialPath={route.path}
        inputRef={routeInputRef}
        label={routeInputContent.label}
        layout="split"
        method={routeMethod}
        methodSelectorLabel={routeInputContent.methodSelectorLabel}
        onMethodChange={(nextMethod) => {
          setRouteMethod(nextMethod);
          setSaveFailure(null);
          onRouteMethodChange?.(nextMethod);
        }}
        onPathChange={(nextPath) => {
          setRoutePath((currentPath) => {
            if (currentPath !== nextPath) setSaveFailure(null);
            return nextPath;
          });
        }}
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
              dispatchDraft({
                type: "set-type-name",
                typeName: nextTypeName,
              });
              setSaveFailure(null);
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
          <IconButton
            ref={(button) => {
              const key = schemaPathKey([]);
              if (button) {
                addPropertyButtonRefs.current.set(key, button);
              } else {
                addPropertyButtonRefs.current.delete(key);
              }
            }}
            type="button"
            className={styles.addProperty}
            aria-label={content.addPropertyLabel}
            onClick={() => addProperty()}
          >
            <PlusIcon />
          </IconButton>
        </div>
      </section>

      {renderPropertyFields(fields, [], [], true)}

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
