"use client";

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  apiResponseArrayItemTypes,
  apiResponseFieldRequiresObjectSchema,
  apiResponseFieldTypes,
  areApiResponseSchemasEquivalent,
  collectApiResponseSchemas,
  hasIncompatibleApiResponseSchema,
  isValidApiResponseSchema,
  isValidTypeScriptTypeName,
  type ApiResponseArrayItemType,
  type ApiResponseFieldType,
  type ApiResponseSchema,
  typeScriptIdentifierPattern,
} from "@/domain/site/api-response-schema";
import {
  apiParameterTypes,
  type ApiRouteContract,
  type ApiRouteHeader,
  type ApiRouteResponse,
  type ApiContractExample,
  type HttpMethod,
} from "@/domain/site/api-route";
import { deriveApiRouteSuggestions } from "@/domain/site/api-route-suggestions";
import type { ApiRouteWorkspaceSaveResult } from "@/domain/site/api-route-workspace";
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
import { CheckboxWithLabel } from "./form/checkbox-with-label";
import { TextInput } from "./form/text-input";
import { IconButton } from "./icon-button";
import { ChevronIcon } from "./icons/chevron-icon";
import { CloseIcon } from "./icons/close-icon";
import { OptionalIcon } from "./icons/optional-icon";
import { PaginationIcon } from "./icons/pagination-icon";
import { PlusIcon } from "./icons/plus-icon";
import { SelectMenu, type SelectMenuOption } from "./select-menu";
import {
  RouteContractDetailsEditor,
  type RouteContractDetailsHandle,
} from "./route-contract-details-editor";
import styles from "./response-schema-editor.module.css";

type SchemaKind = "request" | "response";

type SchemaDefinitionHandle = {
  focusTypeName: () => void;
  getSchema: () => ApiResponseSchema | undefined;
  rejectConflict: () => void;
  updateSuggestedTypeName: (previous: string, next: string) => void;
};

type SchemaDefinitionEditorProps = {
  content: ResponseSchemaEditorContent;
  existingSchemas: readonly ApiResponseSchema[];
  initialSchema?: ApiResponseSchema;
  kind: SchemaKind;
  paginated?: boolean;
  required: boolean;
  suggestedTypeName?: string;
  onPaginationChange?: (paginated: boolean) => void;
};

type ResponseSchemaEditorProps = {
  content: ResponseSchemaEditorContent;
  disabledRouteMethods?: readonly HttpMethod[];
  existingSchemas?: readonly ApiResponseSchema[];
  formId: string;
  getRouteValidationReason: (
    method: HttpMethod,
    path: string,
  ) => BracedPathValidationReason | null;
  onRouteMethodChange?: (method: HttpMethod) => void;
  onSave: (
    contract: Omit<ApiRouteContract, "id" | "method" | "path">,
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

function optionalFiniteNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const SchemaDefinitionEditor = forwardRef<
  SchemaDefinitionHandle,
  SchemaDefinitionEditorProps
>(function SchemaDefinitionEditor({
  content,
  existingSchemas,
  initialSchema,
  kind,
  onPaginationChange,
  paginated = false,
  required,
  suggestedTypeName = "",
}, ref) {
  const [initialDraft] = useState(() => (
    createResponseDraftFields(initialSchema?.fields ?? [])
  ));
  const nextFieldIdRef = useRef(initialDraft.nextId);
  const [draft, dispatchDraft] = useReducer(responseSchemaDraftReducer, {
    fields: initialDraft.fields,
    issue: null,
    selectedTemplateTypeName: "",
    typeName: initialSchema?.typeName ?? suggestedTypeName,
  });
  const { fields, issue, selectedTemplateTypeName, typeName } = draft;
  const validationErrorId = useId();
  const typeInputRef = useRef<HTMLInputElement>(null);
  const suggestionOwnedRef = useRef(!initialSchema && suggestedTypeName.length > 0);
  const propertyInputRefs = useRef(new Map<number, HTMLInputElement>());
  const addPropertyButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingPropertyFocusRef = useRef<PendingPropertyFocus | null>(null);
  const allExistingSchemas = useMemo(
    () => existingSchemas.flatMap(collectApiResponseSchemas),
    [existingSchemas],
  );
  const reusableSchemas = useMemo(() => {
    const schemasByTypeName = new Map<string, ApiResponseSchema[]>();
    for (const schema of allExistingSchemas) {
      const matches = schemasByTypeName.get(schema.typeName) ?? [];
      matches.push(schema);
      schemasByTypeName.set(schema.typeName, matches);
    }
    return [...schemasByTypeName]
      .flatMap(([, schemas]) => {
        const source = schemas[0];
        return source && schemas.every((schema) => (
          areApiResponseSchemasEquivalent(source, schema)
        )) ? [source] : [];
      })
      .sort((left, right) => left.typeName.localeCompare(right.typeName));
  }, [allExistingSchemas]);
  const normalizedTypeName = typeName.trim();
  const draftSchema = useMemo(
    () => draftFieldsToApiResponseSchema(normalizedTypeName, fields),
    [fields, normalizedTypeName],
  );
  const isEmpty = normalizedTypeName.length === 0 && fields.length === 0;
  const schemaIsRequired = required || !isEmpty;
  const isDraftSchemaValid = isValidApiResponseSchema(draftSchema);
  const allDraftFields = useMemo(() => flattenResponseDraftFields(fields), [fields]);
  const hasInvalidTypeName = (
    normalizedTypeName.length > 0
    && !isValidTypeScriptTypeName(normalizedTypeName)
  );
  const invalidPropertyNameIds = useMemo(() => new Set(
    allDraftFields.flatMap((field) => {
      const name = field.name.trim();
      return name.length > 0 && !typeScriptIdentifierPattern.test(name)
        ? [field.id]
        : [];
    }),
  ), [allDraftFields]);
  const duplicatePropertyNameIds = useMemo(
    () => duplicateResponseDraftFieldIds(fields),
    [fields],
  );
  const hasSchemaConflict = (
    isDraftSchemaValid
    && hasIncompatibleApiResponseSchema(existingSchemas, draftSchema)
  );
  const visibleValidationError = duplicatePropertyNameIds.size > 0
    ? content.duplicatePropertyError
    : hasInvalidTypeName || invalidPropertyNameIds.size > 0
      ? content.identifierHint
      : hasSchemaConflict
        ? kind === "response"
          ? content.responseTypeConflictError
          : content.schemaTypeConflictError
        : issue === "incomplete-schema"
          ? content.incompleteSchemaError
          : issue === "duplicate-properties"
            ? content.duplicatePropertyError
            : null;

  useImperativeHandle(ref, () => ({
    focusTypeName: () => typeInputRef.current?.focus(),
    getSchema: () => (
      !schemaIsRequired ? undefined : (isDraftSchemaValid ? draftSchema : undefined)
    ),
    rejectConflict: () => {
      suggestionOwnedRef.current = false;
      dispatchDraft({ type: "reject-schema-conflict" });
      queueMicrotask(() => typeInputRef.current?.focus());
    },
    updateSuggestedTypeName(previous, next) {
      if (typeName.length === 0 || (
        suggestionOwnedRef.current && typeName === previous
      )) {
        dispatchDraft({ type: "set-type-name", typeName: next });
        suggestionOwnedRef.current = next.length > 0;
        if (kind === "response" && next.length === 0 && paginated) {
          onPaginationChange?.(false);
        }
      }
    },
  }), [
    draftSchema,
    isDraftSchemaValid,
    kind,
    onPaginationChange,
    paginated,
    schemaIsRequired,
    typeName,
  ]);

  useLayoutEffect(() => {
    const input = typeInputRef.current;
    if (input) {
      input.setCustomValidity(
        hasInvalidTypeName
          ? content.identifierHint
          : hasSchemaConflict
            ? kind === "response"
              ? content.responseTypeConflictError
              : content.schemaTypeConflictError
            : schemaIsRequired && !isDraftSchemaValid
              ? content.incompleteSchemaError
              : "",
      );
    }
    for (const field of allDraftFields) {
      const propertyInput = propertyInputRefs.current.get(field.id);
      propertyInput?.setCustomValidity(
        duplicatePropertyNameIds.has(field.id)
          ? content.duplicatePropertyError
          : invalidPropertyNameIds.has(field.id)
            ? content.identifierHint
            : "",
      );
    }
  }, [
    allDraftFields,
    content.duplicatePropertyError,
    content.identifierHint,
    content.incompleteSchemaError,
    content.responseTypeConflictError,
    content.schemaTypeConflictError,
    duplicatePropertyNameIds,
    hasInvalidTypeName,
    hasSchemaConflict,
    invalidPropertyNameIds,
    isDraftSchemaValid,
    kind,
    schemaIsRequired,
  ]);

  useLayoutEffect(() => {
    const pending = pendingPropertyFocusRef.current;
    if (!pending) return;
    pendingPropertyFocusRef.current = null;
    if (pending.kind === "field") {
      propertyInputRefs.current.get(pending.fieldId)?.focus();
    } else {
      addPropertyButtonRefs.current.get(pending.schemaPathKey)?.focus();
    }
  }, [fields]);

  function allocateDraftFields(schemaFields: Readonly<ApiResponseSchema["fields"]>) {
    const allocated = createResponseDraftFields(schemaFields, nextFieldIdRef.current);
    nextFieldIdRef.current = allocated.nextId;
    return allocated.fields;
  }

  function createDraftObjectSchema(schema?: ApiResponseSchema): ResponseDraftObjectSchema {
    return {
      fields: allocateDraftFields(schema?.fields ?? []),
      selectedTemplateTypeName: schema?.typeName ?? "",
    };
  }

  function prefillSchema(schema?: ApiResponseSchema) {
    suggestionOwnedRef.current = false;
    if (kind === "response" && !schema && paginated) {
      onPaginationChange?.(false);
    }
    dispatchDraft({
      fields: allocateDraftFields(schema?.fields ?? []),
      selectedTemplateTypeName: schema?.typeName ?? "",
      type: "prefill",
      typeName: schema?.typeName ?? "",
    });
  }

  function commitFields(nextFields: ResponseDraftField[], editedSchemaPath: readonly number[]) {
    dispatchDraft({ editedSchemaPath, fields: nextFields, type: "commit-fields" });
  }

  function addProperty(schemaPath: readonly number[] = []) {
    const id = nextFieldIdRef.current;
    nextFieldIdRef.current += 1;
    pendingPropertyFocusRef.current = { fieldId: id, kind: "field" };
    commitFields(updateDraftFieldsAtSchemaPath(fields, schemaPath, (schemaFields) => [
      ...schemaFields,
      { arrayItemType: "string", id, name: "", optional: false, type: "string" },
    ]), schemaPath);
  }

  function updateProperty(
    schemaPath: readonly number[],
    id: number,
    patch: Partial<ResponseDraftField>,
  ) {
    commitFields(updateDraftFieldsAtSchemaPath(fields, schemaPath, (schemaFields) => (
      schemaFields.map((field) => field.id === id ? { ...field, ...patch } : field)
    )), schemaPath);
  }

  function removeProperty(
    schemaPath: readonly number[],
    id: number,
    siblingFieldId?: number,
  ) {
    pendingPropertyFocusRef.current = siblingFieldId === undefined
      ? { kind: "add", schemaPathKey: schemaPathKey(schemaPath) }
      : { fieldId: siblingFieldId, kind: "field" };
    commitFields(updateDraftFieldsAtSchemaPath(fields, schemaPath, (schemaFields) => (
      schemaFields.filter((field) => field.id !== id)
    )), schemaPath);
  }

  function selectPropertyType(
    schemaPath: readonly number[],
    field: ResponseDraftField,
    type: ApiResponseFieldType,
  ) {
    const arrayItemType = type === "array"
      ? (field.type === "array" ? field.arrayItemType : "string")
      : field.arrayItemType;
    const needsObjectSchema = apiResponseFieldRequiresObjectSchema({ arrayItemType, type });
    updateProperty(schemaPath, field.id, {
      arrayItemType,
      maximum: type === "number" ? field.maximum : undefined,
      maxLength: type === "string" ? field.maxLength : undefined,
      minimum: type === "number" ? field.minimum : undefined,
      minLength: type === "string" ? field.minLength : undefined,
      objectSchema: needsObjectSchema
        ? (field.objectSchema ?? createDraftObjectSchema())
        : undefined,
      pattern: type === "string" ? field.pattern : undefined,
      type,
    });
  }

  function selectArrayItemType(
    schemaPath: readonly number[],
    field: ResponseDraftField,
    arrayItemType: ApiResponseArrayItemType,
  ) {
    updateProperty(schemaPath, field.id, {
      arrayItemType,
      objectSchema: arrayItemType === "object"
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
    return (
      <ul
        aria-label={[content.propertiesLabelByKind[kind], positionPath.join(".")]
          .filter(Boolean).join(" ")}
        className={styles.propertyList}
        data-root-properties={isRoot ? true : undefined}
      >
        {schemaFields.map((field, index) => {
          const position = [...positionPath, index + 1];
          const positionLabel = position.join(".");
          const nestedSchemaPath = [...schemaPath, field.id];
          const objectSchemaRequired = apiResponseFieldRequiresObjectSchema(field);
          const hasObjectDefinitionContent = Boolean(
            objectSchemaRequired && field.objectSchema
            && (reusableSchemas.length > 0 || field.objectSchema.fields.length > 0),
          );
          return (
            <li key={field.id} className={styles.propertyCard}>
              <div
                className={`${styles.propertyGrid} ${
                  field.type === "array" ? styles.propertyGridArray : ""
                }`.trim()}
                role="group"
                aria-label={`${content.propertiesLabelByKind[kind]} ${positionLabel}`}
              >
                <div className={`${styles.fieldGroup} ${styles.propertyNameField}`}>
                  <TextInput
                    ref={(input) => {
                      if (input) propertyInputRefs.current.set(field.id, input);
                      else propertyInputRefs.current.delete(field.id);
                    }}
                    tone="nested"
                    name={`${kind}-property-${field.id}-name`}
                    aria-label={`${content.propertyNameLabel} ${positionLabel}`}
                    autoComplete="off"
                    spellCheck={false}
                    required
                    aria-invalid={duplicatePropertyNameIds.has(field.id)
                      || invalidPropertyNameIds.has(field.id) ? true : undefined}
                    aria-describedby={duplicatePropertyNameIds.has(field.id)
                      || invalidPropertyNameIds.has(field.id) ? validationErrorId : undefined}
                    pattern={typeScriptIdentifierPattern.source}
                    title={content.identifierHint}
                    placeholder={content.propertyNamePlaceholder}
                    trailingControl={(
                      <IconButton
                        className={styles.optionalToggle}
                        variant="transparent"
                        aria-label={`${content.optionalLabel} ${positionLabel}`}
                        aria-pressed={field.optional}
                        title={content.optionalLabel}
                        onClick={() => updateProperty(schemaPath, field.id, {
                          optional: !field.optional,
                        })}
                      >
                        <OptionalIcon />
                      </IconButton>
                    )}
                    value={field.name}
                    onChange={(event) => updateProperty(schemaPath, field.id, {
                      name: event.currentTarget.value,
                    })}
                  />
                </div>
                <div className={styles.typeExpression} data-is-array={field.type === "array"}>
                  <SelectMenu
                    height="large"
                    label={`${content.propertyTypeLabel} ${positionLabel}`}
                    menuPlacement="top"
                    options={apiResponseFieldTypes.map((type) => ({
                      id: type,
                      kind: "action",
                      label: content.typeOptions[type],
                      onSelect: () => selectPropertyType(schemaPath, field, type),
                    } satisfies SelectMenuOption))}
                    rounded
                    selectedId={field.type}
                    width="field"
                  />
                  {field.type === "array" ? (
                    <>
                      <span className={styles.arrayConnector} aria-hidden="true">
                        {content.arrayConnectorLabel}
                      </span>
                      <SelectMenu
                        height="large"
                        label={`${content.arrayItemTypeLabel} ${positionLabel}`}
                        menuPlacement="top"
                        options={apiResponseArrayItemTypes.map((type) => ({
                          id: type,
                          kind: "action",
                          label: content.typeOptions[type],
                          onSelect: () => selectArrayItemType(schemaPath, field, type),
                        } satisfies SelectMenuOption))}
                        rounded
                        selectedId={field.arrayItemType}
                        width="field"
                      />
                    </>
                  ) : null}
                </div>
                <div className={styles.propertyActions}>
                  {objectSchemaRequired && field.objectSchema ? (
                    <IconButton
                      ref={(button) => {
                        const key = schemaPathKey(nestedSchemaPath);
                        if (button) addPropertyButtonRefs.current.set(key, button);
                        else addPropertyButtonRefs.current.delete(key);
                      }}
                      className={styles.addProperty}
                      aria-label={`${content.addPropertyLabel} ${positionLabel}`}
                      onClick={() => addProperty(nestedSchemaPath)}
                    >
                      <PlusIcon />
                    </IconButton>
                  ) : null}
                  <IconButton
                    className={styles.removeProperty}
                    aria-label={`${content.removePropertyLabel} ${positionLabel}`}
                    onClick={() => removeProperty(
                      schemaPath,
                      field.id,
                      schemaFields[index + 1]?.id ?? schemaFields[index - 1]?.id,
                    )}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              </div>
              <div className={styles.propertyConstraintGrid}>
                <TextInput
                  aria-label={`${content.routeContract.parameterDescriptionLabel} ${positionLabel}`}
                  name={`${kind}-property-${field.id}-description`}
                  placeholder={content.routeContract.parameterDescriptionLabel}
                  tone="nested"
                  value={field.description ?? ""}
                  onChange={(event) => updateProperty(schemaPath, field.id, {
                    description: event.currentTarget.value,
                  })}
                />
                {!objectSchemaRequired && field.type !== "array" ? (
                  <TextInput
                    aria-label={`${content.routeContract.allowedValuesLabel} ${positionLabel}`}
                    name={`${kind}-property-${field.id}-allowed-values`}
                    placeholder={content.routeContract.allowedValuesLabel}
                    tone="nested"
                    value={(field.enumValues ?? []).join(", ")}
                    onChange={(event) => updateProperty(schemaPath, field.id, {
                      enumValues: commaSeparatedValues(event.currentTarget.value),
                    })}
                  />
                ) : null}
                {!objectSchemaRequired ? (
                  <>
                    <TextInput
                      aria-label={`${content.routeContract.defaultValueLabel} ${positionLabel}`}
                      name={`${kind}-property-${field.id}-default`}
                      placeholder={content.routeContract.defaultValueLabel}
                      tone="nested"
                      value={field.defaultValue ?? ""}
                      onChange={(event) => updateProperty(schemaPath, field.id, {
                        defaultValue: event.currentTarget.value,
                      })}
                    />
                    <TextInput
                      aria-label={`${content.routeContract.exampleLabel} ${positionLabel}`}
                      name={`${kind}-property-${field.id}-example`}
                      placeholder={content.routeContract.exampleLabel}
                      tone="nested"
                      value={field.example ?? ""}
                      onChange={(event) => updateProperty(schemaPath, field.id, {
                        example: event.currentTarget.value,
                      })}
                    />
                  </>
                ) : null}
                {(field.type === "number") ? (
                  <>
                    <TextInput
                      aria-label={`${content.routeContract.minimumLabel} ${positionLabel}`}
                      inputMode="decimal"
                      name={`${kind}-property-${field.id}-minimum`}
                      placeholder={content.routeContract.minimumLabel}
                      tone="nested"
                      value={field.minimum ?? ""}
                      onChange={(event) => updateProperty(schemaPath, field.id, {
                        minimum: optionalFiniteNumber(event.currentTarget.value),
                      })}
                    />
                    <TextInput
                      aria-label={`${content.routeContract.maximumLabel} ${positionLabel}`}
                      inputMode="decimal"
                      name={`${kind}-property-${field.id}-maximum`}
                      placeholder={content.routeContract.maximumLabel}
                      tone="nested"
                      value={field.maximum ?? ""}
                      onChange={(event) => updateProperty(schemaPath, field.id, {
                        maximum: optionalFiniteNumber(event.currentTarget.value),
                      })}
                    />
                  </>
                ) : null}
                {field.type === "string" ? (
                  <>
                    <TextInput
                      aria-label={`${content.routeContract.minLengthLabel} ${positionLabel}`}
                      inputMode="numeric"
                      name={`${kind}-property-${field.id}-min-length`}
                      placeholder={content.routeContract.minLengthLabel}
                      tone="nested"
                      value={field.minLength ?? ""}
                      onChange={(event) => updateProperty(schemaPath, field.id, {
                        minLength: optionalFiniteNumber(event.currentTarget.value),
                      })}
                    />
                    <TextInput
                      aria-label={`${content.routeContract.maxLengthLabel} ${positionLabel}`}
                      inputMode="numeric"
                      name={`${kind}-property-${field.id}-max-length`}
                      placeholder={content.routeContract.maxLengthLabel}
                      tone="nested"
                      value={field.maxLength ?? ""}
                      onChange={(event) => updateProperty(schemaPath, field.id, {
                        maxLength: optionalFiniteNumber(event.currentTarget.value),
                      })}
                    />
                    <TextInput
                      aria-label={`${content.routeContract.patternLabel} ${positionLabel}`}
                      name={`${kind}-property-${field.id}-pattern`}
                      placeholder={content.routeContract.patternLabel}
                      tone="nested"
                      value={field.pattern ?? ""}
                      onChange={(event) => updateProperty(schemaPath, field.id, {
                        pattern: event.currentTarget.value,
                      })}
                    />
                  </>
                ) : null}
              </div>
              {hasObjectDefinitionContent && field.objectSchema ? (
                <div className={styles.objectDefinition}>
                  {reusableSchemas.length > 0 ? (
                    <div className={styles.objectTemplateControl}>
                      <SelectMenu
                        height="large"
                        label={`${content.objectTypeTemplateLabel} ${positionLabel}`}
                        menuPlacement="top"
                        options={[
                          {
                            id: "",
                            kind: "action",
                            label: content.newSchemaTypeLabel,
                            onSelect: () => updateProperty(schemaPath, field.id, {
                              objectSchema: createDraftObjectSchema(),
                            }),
                          },
                          ...reusableSchemas.map((schema) => ({
                            id: schema.typeName,
                            kind: "action" as const,
                            label: schema.typeName,
                            onSelect: () => updateProperty(schemaPath, field.id, {
                              objectSchema: createDraftObjectSchema(schema),
                            }),
                          })),
                        ]}
                        rounded
                        selectedId={field.objectSchema.selectedTemplateTypeName}
                        width="field"
                      />
                    </div>
                  ) : null}
                  {field.objectSchema.fields.length > 0 ? (
                    <div className={styles.objectProperties} data-nested-properties="true">
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
    <div className={styles.schemaDefinition}>
      <div
        className={styles.responseTypeControls}
        data-has-template={reusableSchemas.length > 0}
      >
        <TextInput
          ref={typeInputRef}
          tone="nested"
          name={`${kind}Type`}
          autoComplete="off"
          spellCheck={false}
          required={schemaIsRequired}
          pattern={typeScriptIdentifierPattern.source}
          title={content.identifierHint}
          placeholder={content.typePlaceholderByKind[kind]}
          value={typeName}
          aria-label={content.typeLabelByKind[kind]}
          aria-description={content.typeDescriptionByKind[kind]}
          aria-invalid={hasInvalidTypeName || hasSchemaConflict ? true : undefined}
          aria-describedby={hasInvalidTypeName || hasSchemaConflict
            ? validationErrorId
            : undefined}
          trailingControl={kind === "response" && normalizedTypeName ? (
            <IconButton
              className={styles.paginationToggle}
              variant="transparent"
              aria-label={content.paginationLabel}
              aria-pressed={paginated}
              title={content.paginationDescription}
              onClick={() => onPaginationChange?.(!paginated)}
            >
              <PaginationIcon />
            </IconButton>
          ) : undefined}
          onChange={(event) => {
            suggestionOwnedRef.current = false;
            if (
              kind === "response"
              && event.currentTarget.value.trim().length === 0
              && paginated
            ) {
              onPaginationChange?.(false);
            }
            dispatchDraft({
              type: "set-type-name",
              typeName: event.currentTarget.value,
            });
          }}
        />
        {reusableSchemas.length > 0 ? (
          <SelectMenu
            height="large"
            label={content.typeTemplateLabelByKind[kind]}
            options={[
              {
                id: "",
                kind: "action",
                label: content.newSchemaTypeLabel,
                onSelect: () => prefillSchema(),
              },
              ...reusableSchemas.map((schema) => ({
                id: schema.typeName,
                kind: "action" as const,
                label: schema.typeName,
                onSelect: () => prefillSchema(schema),
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
            if (button) addPropertyButtonRefs.current.set(key, button);
            else addPropertyButtonRefs.current.delete(key);
          }}
          className={styles.addProperty}
          aria-label={content.addPropertyLabel}
          onClick={() => addProperty()}
        >
          <PlusIcon />
        </IconButton>
      </div>
      {renderPropertyFields(fields, [], [], true)}
      {visibleValidationError ? (
        <p id={validationErrorId} className={styles.error} role="alert">
          {visibleValidationError}
        </p>
      ) : null}
    </div>
  );
});

type ToggleSectionProps = {
  children: ReactNode;
  collapseLabel: string;
  description: string;
  expandLabel: string;
  label: string;
  onToggle: () => void;
  open: boolean;
};

function ToggleSection({
  children,
  collapseLabel,
  description,
  expandLabel,
  label,
  onToggle,
  open,
}: ToggleSectionProps) {
  const headingId = useId();
  const panelId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <button
        type="button"
        className={styles.sectionToggle}
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={`${label}: ${
          open ? collapseLabel : expandLabel
        }`}
        onClick={onToggle}
      >
        <span className={styles.sectionHeader}>
          <span id={headingId} className={styles.sectionTitle}>
            {label}
          </span>
          <span className={styles.sectionDescription}>
            {description}
          </span>
        </span>
        <ChevronIcon />
      </button>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}

type ResponseHeaderDraft = ApiRouteHeader & { id: number };

type ResponseDraft = {
  contentTypes: string;
  description: string;
  example: string;
  headers: ResponseHeaderDraft[];
  id: number;
  initialSchema?: ApiResponseSchema;
  paginated: boolean;
  status: string;
};

function commaSeparatedValues(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function parseJsonExample(value: string):
  | { example?: ApiContractExample; valid: true }
  | { valid: false } {
  if (!value.trim()) return { valid: true };
  try {
    return { example: JSON.parse(value) as ApiContractExample, valid: true };
  } catch {
    return { valid: false };
  }
}

function initialResponseDrafts(
  route: ApiRouteContract,
  suggestedStatus: string,
  defaultDescription: string,
): ResponseDraft[] {
  const responses = route.responses ?? [{
    contentTypes: suggestedStatus === "204" ? [] : ["application/json"],
    description: defaultDescription,
    ...(route.paginated ? { paginated: true } : {}),
    ...(route.response ? { schema: route.response } : {}),
    status: suggestedStatus,
  }];
  let nextHeaderId = 0;
  return responses.map((response, index) => ({
    contentTypes: response.contentTypes.join(", "),
    description: response.description,
    example: response.example === undefined
      ? ""
      : JSON.stringify(response.example),
    headers: (response.headers ?? []).map((header) => ({
      ...header,
      id: nextHeaderId++,
    })),
    id: index,
    initialSchema: response.schema,
    paginated: response.paginated === true,
    status: response.status,
  }));
}

export function ResponseSchemaEditor({
  content,
  disabledRouteMethods = [],
  existingSchemas = [],
  formId,
  getRouteValidationReason,
  onRouteMethodChange,
  onSave,
  route,
  routeInputContent,
}: ResponseSchemaEditorProps) {
  const initialSuggestions = deriveApiRouteSuggestions(route.method, route.path);
  const [routeMethod, setRouteMethod] = useState(route.method);
  const [routePath, setRoutePath] = useState(route.path);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [requestContentTypes, setRequestContentTypes] = useState(
    route.requestBody?.contentTypes.join(", ") ?? "application/json",
  );
  const [requestRequired, setRequestRequired] = useState(
    route.requestBody?.required === true,
  );
  const [requestExample, setRequestExample] = useState(
    route.requestBody?.example === undefined
      ? ""
      : JSON.stringify(route.requestBody.example),
  );
  const [responses, setResponses] = useState<ResponseDraft[]>(() => (
    initialResponseDrafts(
      route,
      initialSuggestions.responseStatus,
      content.routeContract.defaultResponseDescription,
    )
  ));
  const [responseIssue, setResponseIssue] = useState<string | null>(null);
  const [saveFailure, setSaveFailure] = useState<"route-conflict" | null>(null);
  const nextResponseIdRef = useRef(responses.length);
  const nextResponseHeaderIdRef = useRef(
    responses.reduce((maximum, response) => Math.max(
      maximum,
      ...response.headers.map((header) => header.id + 1),
    ), 0),
  );
  const suggestionsRef = useRef(initialSuggestions);
  const detailsRef = useRef<RouteContractDetailsHandle>(null);
  const requestRef = useRef<SchemaDefinitionHandle>(null);
  const responseRefs = useRef(new Map<number, SchemaDefinitionHandle>());
  const routeInputRef = useRef<HTMLInputElement>(null);

  function updateIdentity(nextMethod: HttpMethod, nextPath: string) {
    const previous = suggestionsRef.current;
    const next = deriveApiRouteSuggestions(nextMethod, nextPath);
    detailsRef.current?.updateIdentity(nextMethod, nextPath);
    requestRef.current?.updateSuggestedTypeName(
      previous.requestTypeName,
      next.requestTypeName,
    );
    const firstResponse = responses[0];
    if (firstResponse) {
      const firstResponseHasSchema = Boolean(
        responseRefs.current.get(firstResponse.id)?.getSchema()
        ?? firstResponse.initialSchema,
      );
      responseRefs.current.get(firstResponse.id)?.updateSuggestedTypeName(
        previous.responseTypeName,
        next.responseTypeName,
      );
      setResponses((current) => current.map((response, index) => (
        index === 0 && response.status === previous.responseStatus
          && !(next.responseStatus === "204" && firstResponseHasSchema)
          ? {
              ...response,
              contentTypes: next.responseStatus === "204"
                ? ""
                : response.contentTypes || "application/json",
              status: next.responseStatus,
            }
          : response
      )));
    }
    suggestionsRef.current = next;
  }

  function addResponse() {
    const preferredStatuses = ["400", "401", "403", "404", "409", "500"];
    const usedStatuses = new Set(responses.map((response) => response.status));
    const status = preferredStatuses.find((candidate) => !usedStatuses.has(candidate))
      ?? "default";
    setResponses((current) => [
      ...current,
      {
        contentTypes: "application/json",
        description: content.routeContract.defaultResponseDescription,
        example: "",
        headers: [],
        id: nextResponseIdRef.current++,
        paginated: false,
        status,
      },
    ]);
  }

  function updateResponse(id: number, patch: Partial<ResponseDraft>) {
    setResponseIssue(null);
    setResponses((current) => current.map((response) => (
      response.id === id ? { ...response, ...patch } : response
    )));
  }

  function removeResponse(id: number) {
    if (responses.length <= 1) return;
    responseRefs.current.delete(id);
    setResponses((current) => current.filter((response) => response.id !== id));
  }

  function addResponseHeader(responseId: number) {
    updateResponse(responseId, {
      headers: [
        ...(responses.find((response) => response.id === responseId)?.headers ?? []),
        {
          id: nextResponseHeaderIdRef.current++,
          name: "",
          type: "string",
        },
      ],
    });
  }

  function updateResponseHeader(
    responseId: number,
    headerId: number,
    patch: Partial<ApiRouteHeader>,
  ) {
    const response = responses.find((candidate) => candidate.id === responseId);
    if (!response) return;
    updateResponse(responseId, {
      headers: response.headers.map((header) => (
        header.id === headerId ? { ...header, ...patch } : header
      )),
    });
  }

  function removeResponseHeader(responseId: number, headerId: number) {
    const response = responses.find((candidate) => candidate.id === responseId);
    if (!response) return;
    updateResponse(responseId, {
      headers: response.headers.filter((header) => header.id !== headerId),
    });
  }

  function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = requestRef.current?.getSchema();
    const parsedRequestExample = parseJsonExample(requestExample);
    const parsedResponseExamples = responses.map((response) => (
      parseJsonExample(response.example)
    ));
    if (!parsedRequestExample.valid
      || parsedResponseExamples.some((example) => !example.valid)) {
      setRequestOpen(true);
      setResponseOpen(true);
      setResponseIssue(content.routeContract.invalidExampleError);
      return;
    }
    const normalizedResponses: ApiRouteResponse[] = responses.map((response) => {
      const schema = responseRefs.current.get(response.id)?.getSchema();
      const parsedExample = parseJsonExample(response.example);
      return {
        contentTypes: commaSeparatedValues(response.contentTypes),
        description: response.description.trim(),
        ...(parsedExample.valid && parsedExample.example !== undefined
          ? { example: parsedExample.example }
          : {}),
        headers: response.headers
          .filter((header) => header.name.trim())
          .map((header): ApiRouteHeader => ({
            ...(header.description?.trim()
              ? { description: header.description.trim() }
              : {}),
            name: header.name.trim(),
            type: header.type,
          })),
        ...(response.paginated ? { paginated: true } : {}),
        ...(schema ? { schema } : {}),
        status: response.status,
      };
    });
    const statuses = normalizedResponses.map((response) => response.status);
    if (new Set(statuses).size !== statuses.length) {
      setResponseIssue(content.routeContract.duplicateResponseStatusError);
      setResponseOpen(true);
      return;
    }
    const schemas = [
      request,
      ...normalizedResponses.map((response) => response.schema),
    ].filter((schema): schema is ApiResponseSchema => Boolean(schema));
    if (schemas.some((schema, index) => hasIncompatibleApiResponseSchema(
      schemas.filter((_, candidateIndex) => candidateIndex !== index),
      schema,
    ))) {
      setResponseOpen(true);
      for (const responseRef of responseRefs.current.values()) {
        responseRef.rejectConflict();
      }
      return;
    }
    const primaryResponse = normalizedResponses.find((response) => (
      response.schema && /^2[0-9]{2}$/.test(response.status)
    )) ?? normalizedResponses.find((response) => response.schema);
    const hasRequestBody = Boolean(
      request || requestRequired || requestExample.trim() || route.requestBody,
    );
    const result = onSave({
      ...detailsRef.current?.getContract(),
      paginated: primaryResponse?.paginated === true ? true : undefined,
      ...(request ? { request } : {}),
      ...(hasRequestBody
        ? {
            requestBody: {
              contentTypes: commaSeparatedValues(requestContentTypes),
              ...(parsedRequestExample.example !== undefined
                ? { example: parsedRequestExample.example }
                : {}),
              required: requestRequired,
              ...(request ? { schema: request } : {}),
            },
          }
        : {}),
      ...(primaryResponse?.schema ? { response: primaryResponse.schema } : {}),
      responses: normalizedResponses,
    }, { method: routeMethod, path: routePath });
    if (result === "schema-conflict") {
      setResponseOpen(true);
      for (const responseRef of responseRefs.current.values()) {
        responseRef.rejectConflict();
      }
    } else if (result === "contract-invalid") {
      setDetailsOpen(true);
      setRequestOpen(true);
      setResponseOpen(true);
      setResponseIssue(content.routeContract.invalidContractError);
    } else if (result === "route-conflict") {
      setSaveFailure("route-conflict");
      queueMicrotask(() => routeInputRef.current?.focus());
    }
  }

  return (
    <form id={formId} className={styles.form} onSubmit={submitContract}>
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
          updateIdentity(nextMethod, routePath);
          setRouteMethod(nextMethod);
          setSaveFailure(null);
          onRouteMethodChange?.(nextMethod);
        }}
        onPathChange={(nextPath) => {
          updateIdentity(routeMethod, nextPath);
          setRoutePath(nextPath);
          setSaveFailure(null);
        }}
        placeholder={routeInputContent.placeholder}
        prefixHint={routeInputContent.pathPrefixHint}
        required
        tone="nested"
        validationMessages={{
          duplicate: routeInputContent.duplicatePathError,
          syntax: routeInputContent.invalidPathError,
        }}
      />
      <ToggleSection
        collapseLabel={content.collapseSectionLabel}
        description={content.routeContract.detailsDescription}
        expandLabel={content.expandSectionLabel}
        label={content.routeContract.detailsLabel}
        open={detailsOpen}
        onToggle={() => setDetailsOpen((current) => !current)}
      >
        <RouteContractDetailsEditor
          ref={detailsRef}
          content={content.routeContract}
          route={route}
        />
      </ToggleSection>
      <ToggleSection
        collapseLabel={content.collapseSectionLabel}
        description={content.typeDescriptionByKind.request}
        expandLabel={content.expandSectionLabel}
        label={content.typeLabelByKind.request}
        open={requestOpen}
        onToggle={() => setRequestOpen((current) => !current)}
      >
        <div className={styles.contractFieldGrid}>
          <label className={styles.contractField}>
            <span className={styles.label}>{content.routeContract.contentTypesLabel}</span>
            <TextInput
              aria-label={content.routeContract.contentTypesLabel}
              name="request-content-types"
              required={requestRequired || Boolean(route.requestBody)}
              placeholder={content.routeContract.contentTypesHint}
              tone="nested"
              value={requestContentTypes}
              onChange={(event) => setRequestContentTypes(event.currentTarget.value)}
            />
          </label>
          <CheckboxWithLabel
            checked={requestRequired}
            label={content.routeContract.requestRequiredLabel}
            onChange={(event) => setRequestRequired(event.currentTarget.checked)}
          />
          <label className={`${styles.contractField} ${styles.contractWideField}`}>
            <span className={styles.label}>{content.routeContract.exampleLabel}</span>
            <TextInput
              aria-label={content.routeContract.requestExampleLabel}
              name="request-example"
              placeholder={content.routeContract.exampleHint}
              tone="nested"
              value={requestExample}
              onChange={(event) => setRequestExample(event.currentTarget.value)}
            />
          </label>
        </div>
        <SchemaDefinitionEditor
          ref={requestRef}
          content={content}
          existingSchemas={existingSchemas}
          initialSchema={route.requestBody?.schema ?? route.request}
          kind="request"
          required={false}
          suggestedTypeName={initialSuggestions.requestTypeName}
        />
      </ToggleSection>
      <ToggleSection
        collapseLabel={content.collapseSectionLabel}
        description={content.typeDescriptionByKind.response}
        expandLabel={content.expandSectionLabel}
        label={content.typeLabelByKind.response}
        open={responseOpen}
        onToggle={() => setResponseOpen((current) => !current)}
      >
        <div className={styles.contractDefinition}>
          <div className={styles.contractSubsectionHeader}>
            <span className={styles.label}>{content.typeLabelByKind.response}</span>
            <IconButton
              aria-label={content.routeContract.addResponseLabel}
              onClick={addResponse}
            >
              <PlusIcon />
            </IconButton>
          </div>
          {responses.map((response, responseIndex) => (
            <div
              key={response.id}
              className={styles.responseCard}
              role="group"
              aria-label={`${content.typeLabelByKind.response} ${responseIndex + 1}`}
            >
              <div className={styles.responseMetadataRow}>
                <label className={styles.contractField}>
                  <span className={styles.label}>{content.routeContract.responseStatusLabel}</span>
                  <TextInput
                    aria-label={`${content.routeContract.responseStatusLabel} ${responseIndex + 1}`}
                    name={`response-${response.id}-status`}
                    pattern="(?:default|[1-5][0-9]{2})"
                    required
                    tone="nested"
                    value={response.status}
                    onChange={(event) => updateResponse(response.id, {
                      status: event.currentTarget.value,
                    })}
                  />
                </label>
                <label className={styles.contractField}>
                  <span className={styles.label}>{content.routeContract.responseDescriptionLabel}</span>
                  <TextInput
                    aria-label={`${content.routeContract.responseDescriptionLabel} ${responseIndex + 1}`}
                    name={`response-${response.id}-description`}
                    required
                    tone="nested"
                    value={response.description}
                    onChange={(event) => updateResponse(response.id, {
                      description: event.currentTarget.value,
                    })}
                  />
                </label>
                <label className={styles.contractField}>
                  <span className={styles.label}>{content.routeContract.contentTypesLabel}</span>
                  <TextInput
                    aria-label={`${content.routeContract.contentTypesLabel} ${responseIndex + 1}`}
                    name={`response-${response.id}-content-types`}
                    placeholder={content.routeContract.contentTypesHint}
                    tone="nested"
                    value={response.contentTypes}
                    onChange={(event) => updateResponse(response.id, {
                      contentTypes: event.currentTarget.value,
                    })}
                  />
                </label>
                {responses.length > 1 ? (
                  <IconButton
                    aria-label={`${content.routeContract.removeResponseLabel} ${responseIndex + 1}`}
                    onClick={() => removeResponse(response.id)}
                  >
                    <CloseIcon />
                  </IconButton>
                ) : (
                  <span
                    aria-hidden="true"
                    className={styles.responseActionSpacer}
                  />
                )}
              </div>
              <label className={styles.contractField}>
                <span className={styles.label}>{content.routeContract.exampleLabel}</span>
                <TextInput
                  aria-label={`${content.routeContract.responseExampleLabel} ${responseIndex + 1}`}
                  name={`response-${response.id}-example`}
                  placeholder={content.routeContract.exampleHint}
                  tone="nested"
                  value={response.example}
                  onChange={(event) => updateResponse(response.id, {
                    example: event.currentTarget.value,
                  })}
                />
              </label>
              <SchemaDefinitionEditor
                ref={(handle) => {
                  if (handle) responseRefs.current.set(response.id, handle);
                  else responseRefs.current.delete(response.id);
                }}
                content={content}
                existingSchemas={existingSchemas}
                initialSchema={response.initialSchema}
                kind="response"
                onPaginationChange={(paginated) => updateResponse(response.id, {
                  paginated,
                })}
                paginated={response.paginated}
                required={responseIndex === 0
                  && response.status !== "204"
                  && routeMethod !== "HEAD"
                  && routeMethod !== "OPTIONS"}
                suggestedTypeName={responseIndex === 0
                  && response.status !== "204"
                  && routeMethod !== "HEAD"
                  && routeMethod !== "OPTIONS"
                  ? initialSuggestions.responseTypeName
                  : ""}
              />
              <div className={styles.contractSubsectionHeader}>
                <span className={styles.label}>{content.routeContract.responseHeadersLabel}</span>
                <IconButton
                  aria-label={`${content.routeContract.addResponseHeaderLabel} ${responseIndex + 1}`}
                  onClick={() => addResponseHeader(response.id)}
                >
                  <PlusIcon />
                </IconButton>
              </div>
              {response.headers.map((header, headerIndex) => (
                <div key={header.id} className={styles.responseHeaderRow}>
                  <TextInput
                    aria-label={`${content.routeContract.responseHeaderNameLabel} ${responseIndex + 1}.${headerIndex + 1}`}
                    name={`response-${response.id}-header-${header.id}-name`}
                    pattern="[A-Za-z][A-Za-z0-9_-]*"
                    required
                    tone="nested"
                    value={header.name}
                    onChange={(event) => updateResponseHeader(response.id, header.id, {
                      name: event.currentTarget.value,
                    })}
                  />
                  <SelectMenu
                    height="large"
                    label={`${content.routeContract.parameterTypeLabel} ${responseIndex + 1}.${headerIndex + 1}`}
                    options={apiParameterTypes.map((type) => ({
                      id: type,
                      kind: "action",
                      label: content.routeContract.parameterTypeOptions[type],
                      onSelect: () => updateResponseHeader(response.id, header.id, { type }),
                    }))}
                    rounded
                    selectedId={header.type}
                    width="field"
                  />
                  <TextInput
                    aria-label={`${content.routeContract.responseHeaderDescriptionLabel} ${responseIndex + 1}.${headerIndex + 1}`}
                    name={`response-${response.id}-header-${header.id}-description`}
                    tone="nested"
                    value={header.description ?? ""}
                    onChange={(event) => updateResponseHeader(response.id, header.id, {
                      description: event.currentTarget.value,
                    })}
                  />
                  <IconButton
                    aria-label={`${content.routeContract.removeResponseHeaderLabel} ${responseIndex + 1}.${headerIndex + 1}`}
                    onClick={() => removeResponseHeader(response.id, header.id)}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              ))}
            </div>
          ))}
          {responseIssue ? <p className={styles.error} role="alert">{responseIssue}</p> : null}
        </div>
      </ToggleSection>
    </form>
  );
}
