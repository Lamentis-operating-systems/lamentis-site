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
import type { ApiRouteContract, HttpMethod } from "@/domain/site/api-route";
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
import { TextInput } from "./form/text-input";
import { IconButton } from "./icon-button";
import { ChevronIcon } from "./icons/chevron-icon";
import { CloseIcon } from "./icons/close-icon";
import { OptionalIcon } from "./icons/optional-icon";
import { PaginationIcon } from "./icons/pagination-icon";
import { PlusIcon } from "./icons/plus-icon";
import { SelectMenu, type SelectMenuOption } from "./select-menu";
import styles from "./response-schema-editor.module.css";

type SchemaKind = "request" | "response";

type SchemaDefinitionHandle = {
  focusTypeName: () => void;
  getSchema: () => ApiResponseSchema | undefined;
  rejectConflict: () => void;
};

type SchemaDefinitionEditorProps = {
  content: ResponseSchemaEditorContent;
  existingSchemas: readonly ApiResponseSchema[];
  initialSchema?: ApiResponseSchema;
  kind: SchemaKind;
  paginated?: boolean;
  required: boolean;
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
    contract: Pick<ApiRouteContract, "paginated" | "request" | "response">,
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
}, ref) {
  const [initialDraft] = useState(() => (
    createResponseDraftFields(initialSchema?.fields ?? [])
  ));
  const nextFieldIdRef = useRef(initialDraft.nextId);
  const [draft, dispatchDraft] = useReducer(responseSchemaDraftReducer, {
    fields: initialDraft.fields,
    issue: null,
    selectedTemplateTypeName: "",
    typeName: initialSchema?.typeName ?? "",
  });
  const { fields, issue, selectedTemplateTypeName, typeName } = draft;
  const validationErrorId = useId();
  const typeInputRef = useRef<HTMLInputElement>(null);
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
    rejectConflict: () => dispatchDraft({ type: "reject-schema-conflict" }),
  }), [draftSchema, isDraftSchemaValid, schemaIsRequired]);

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
          trailingControl={kind === "response" ? (
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
          onChange={(event) => dispatchDraft({
            type: "set-type-name",
            typeName: event.currentTarget.value,
          })}
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
  content: ResponseSchemaEditorContent;
  kind: SchemaKind;
  onToggle: () => void;
  open: boolean;
};

function ToggleSection({ children, content, kind, onToggle, open }: ToggleSectionProps) {
  const headingId = useId();
  const panelId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <button
        type="button"
        className={styles.sectionToggle}
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={`${content.typeLabelByKind[kind]}: ${
          open ? content.collapseSectionLabel : content.expandSectionLabel
        }`}
        onClick={onToggle}
      >
        <span className={styles.sectionHeader}>
          <span id={headingId} className={styles.sectionTitle}>
            {content.typeLabelByKind[kind]}
          </span>
          <span className={styles.sectionDescription}>
            {content.typeDescriptionByKind[kind]}
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
  const [routeMethod, setRouteMethod] = useState(route.method);
  const [routePath, setRoutePath] = useState(route.path);
  const [requestOpen, setRequestOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [paginated, setPaginated] = useState(route.paginated === true);
  const [saveFailure, setSaveFailure] = useState<"route-conflict" | null>(null);
  const requestRef = useRef<SchemaDefinitionHandle>(null);
  const responseRef = useRef<SchemaDefinitionHandle>(null);
  const routeInputRef = useRef<HTMLInputElement>(null);

  function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = requestRef.current?.getSchema();
    const response = responseRef.current?.getSchema();
    if (!response) {
      setResponseOpen(true);
      queueMicrotask(() => responseRef.current?.focusTypeName());
      return;
    }
    if (request && hasIncompatibleApiResponseSchema([request], response)) {
      setRequestOpen(true);
      queueMicrotask(() => requestRef.current?.focusTypeName());
      return;
    }
    const result = onSave({
      paginated,
      ...(request ? { request } : {}),
      response,
    }, { method: routeMethod, path: routePath });
    if (result === "schema-conflict") {
      setResponseOpen(true);
      responseRef.current?.rejectConflict();
      queueMicrotask(() => responseRef.current?.focusTypeName());
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
          setRouteMethod(nextMethod);
          setSaveFailure(null);
          onRouteMethodChange?.(nextMethod);
        }}
        onPathChange={(nextPath) => {
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
        content={content}
        kind="request"
        open={requestOpen}
        onToggle={() => setRequestOpen((current) => !current)}
      >
        <SchemaDefinitionEditor
          ref={requestRef}
          content={content}
          existingSchemas={existingSchemas}
          initialSchema={route.request}
          kind="request"
          required={false}
        />
      </ToggleSection>
      <ToggleSection
        content={content}
        kind="response"
        open={responseOpen}
        onToggle={() => setResponseOpen((current) => !current)}
      >
        <SchemaDefinitionEditor
          ref={responseRef}
          content={content}
          existingSchemas={existingSchemas}
          initialSchema={route.response}
          kind="response"
          onPaginationChange={setPaginated}
          paginated={paginated}
          required
        />
      </ToggleSection>
    </form>
  );
}
