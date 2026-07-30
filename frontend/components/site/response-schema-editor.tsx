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
import {
  ApiRouteRow,
  type ApiRouteRowContent,
} from "./api-route-row";
import { CheckboxWithLabel } from "./form/checkbox-with-label";
import { TextInput } from "./form/text-input";
import { IconButton } from "./icon-button";
import { CloseIcon } from "./icons/close-icon";
import { PlusIcon } from "./icons/plus-icon";
import { SelectMenu, type SelectMenuOption } from "./select-menu";
import { VisuallyHidden } from "./visually-hidden";
import styles from "./response-schema-editor.module.css";

type ResponseSchemaEditorProps = {
  content: ResponseSchemaEditorContent;
  disabledRouteMethods?: readonly HttpMethod[];
  existingResponseSchemas: readonly ApiResponseSchema[];
  formId: string;
  onCopyRoute: () => void;
  onDeleteRoute: () => void;
  onEditRoute: () => void;
  onRouteMethodChange: (method: HttpMethod) => void;
  onSave: (schema: ApiResponseSchema) => boolean;
  route: ApiRouteContract;
  routeContent: ApiRouteRowContent;
};

type DraftField = {
  arrayItemType: ApiResponseArrayItemType;
  id: number;
  name: string;
  optional: boolean;
  type: ApiResponseFieldType;
};

export function ResponseSchemaEditor({
  content,
  disabledRouteMethods = [],
  existingResponseSchemas,
  formId,
  onCopyRoute,
  onDeleteRoute,
  onEditRoute,
  onRouteMethodChange,
  onSave,
  route,
  routeContent,
}: ResponseSchemaEditorProps) {
  const [typeName, setTypeName] = useState("");
  const [fields, setFields] = useState<DraftField[]>([]);
  const [selectedTemplateTypeName, setSelectedTemplateTypeName] =
    useState("");
  const [routeMethod, setRouteMethod] = useState(route.method);
  const [error, setError] = useState("");
  const [saveRejectedForConflict, setSaveRejectedForConflict] =
    useState(false);
  const responseTypeHeadingId = useId();
  const responseTypeDescriptionId = useId();
  const propertiesHeadingId = useId();
  const validationErrorId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const nextFieldIdRef = useRef(0);
  const reusableResponseSchemas = useMemo(() => {
    const schemasByTypeName = new Map<string, ApiResponseSchema[]>();

    for (const schema of existingResponseSchemas) {
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
  }, [existingResponseSchemas]);
  const normalizedTypeName = typeName.trim();
  const draftSchema = useMemo<ApiResponseSchema>(() => ({
    fields: fields.map((field) => ({
      ...(field.type === "array"
        ? { arrayItemType: field.arrayItemType }
        : {}),
      name: field.name.trim(),
      optional: field.optional,
      type: field.type,
    })),
    typeName: normalizedTypeName,
  }), [fields, normalizedTypeName]);
  const hasInvalidTypeName = (
    normalizedTypeName.length > 0
    && !isValidTypeScriptTypeName(normalizedTypeName)
  );
  const invalidPropertyNameIds = useMemo(() => new Set(
    fields.flatMap((field) => {
      const name = field.name.trim();
      return (
        name.length > 0
        && !typeScriptIdentifierPattern.test(name)
      ) ? [field.id] : [];
    }),
  ), [fields]);
  const duplicatePropertyNames = useMemo(() => {
    const propertyNameCounts = new Map<string, number>();

    for (const field of fields) {
      const name = field.name.trim();
      if (name) {
        propertyNameCounts.set(
          name,
          (propertyNameCounts.get(name) ?? 0) + 1,
        );
      }
    }

    return new Set(
      [...propertyNameCounts]
        .filter(([, count]) => count > 1)
        .map(([name]) => name),
    );
  }, [fields]);
  const hasResponseTypeConflict = (
    saveRejectedForConflict
    || (
      isValidApiResponseSchema(draftSchema)
      && hasIncompatibleApiResponseSchema(
        existingResponseSchemas,
        draftSchema,
      )
    )
  );
  const visibleValidationError = duplicatePropertyNames.size > 0
    ? content.duplicatePropertyError
    : (
        hasInvalidTypeName || invalidPropertyNameIds.size > 0
          ? content.identifierHint
          : hasResponseTypeConflict
            ? content.responseTypeConflictError
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
          : hasResponseTypeConflict
            ? content.responseTypeConflictError
            : "",
      );
    }

    for (const field of fields) {
      const input = form.elements.namedItem(`property-${field.id}-name`);
      if (input instanceof HTMLInputElement) {
        const normalizedPropertyName = field.name.trim();
        input.setCustomValidity(
          duplicatePropertyNames.has(normalizedPropertyName)
            ? content.duplicatePropertyError
            : invalidPropertyNameIds.has(field.id)
              ? content.identifierHint
              : "",
        );
      }
    }
  }, [
    content.duplicatePropertyError,
    content.identifierHint,
    content.responseTypeConflictError,
    duplicatePropertyNames,
    fields,
    hasInvalidTypeName,
    hasResponseTypeConflict,
    invalidPropertyNameIds,
  ]);

  function clearValidationError() {
    setError("");
    setSaveRejectedForConflict(false);
  }

  function prefillResponseType(schema?: ApiResponseSchema) {
    setSelectedTemplateTypeName(schema?.typeName ?? "");
    setTypeName(schema?.typeName ?? "");
    setFields((schema?.fields ?? []).map((field) => {
      const id = nextFieldIdRef.current;
      nextFieldIdRef.current += 1;

      return {
        arrayItemType: field.type === "array"
          ? (field.arrayItemType ?? "string")
          : "string",
        id,
        name: field.name,
        optional: field.optional,
        type: field.type,
      };
    }));
    clearValidationError();
  }

  function addProperty() {
    const id = nextFieldIdRef.current;
    nextFieldIdRef.current += 1;
    setFields((currentFields) => [
      ...currentFields,
      {
        arrayItemType: "string",
        id,
        name: "",
        optional: false,
        type: "string",
      },
    ]);
    clearValidationError();
  }

  function updateProperty(id: number, patch: Partial<DraftField>) {
    setFields((currentFields) => currentFields.map((field) => (
      field.id === id ? { ...field, ...patch } : field
    )));
    clearValidationError();
  }

  function removeProperty(id: number) {
    setFields((currentFields) => (
      currentFields.filter((field) => field.id !== id)
    ));
    clearValidationError();
  }

  function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (duplicatePropertyNames.size > 0) {
      setError(content.duplicatePropertyError);
      return;
    }

    if (!isValidApiResponseSchema(draftSchema)) {
      setError(content.identifierHint);
      return;
    }

    if (
      hasIncompatibleApiResponseSchema(
        existingResponseSchemas,
        draftSchema,
      )
      || !onSave(draftSchema)
    ) {
      setSaveRejectedForConflict(true);
    }
  }

  return (
    <form
      ref={formRef}
      id={formId}
      className={styles.form}
      onSubmit={submitResponse}
    >
      <ApiRouteRow
        className={styles.overlayRouteRow}
        content={routeContent}
        disabledMethods={disabledRouteMethods}
        onCopy={onCopyRoute}
        onDelete={onDeleteRoute}
        onEdit={onEditRoute}
        onMethodChange={(nextMethod) => {
          setRouteMethod(nextMethod);
          onRouteMethodChange(nextMethod);
        }}
        route={{ ...route, method: routeMethod }}
      />

      <section
        className={styles.section}
        aria-labelledby={responseTypeHeadingId}
      >
        <div className={styles.sectionHeader}>
          <h3 id={responseTypeHeadingId} className={styles.sectionTitle}>
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
              hasInvalidTypeName || hasResponseTypeConflict ? true : undefined
            }
            aria-describedby={
              hasInvalidTypeName || hasResponseTypeConflict
                ? `${responseTypeDescriptionId} ${validationErrorId}`
                : responseTypeDescriptionId
            }
            onChange={(event) => {
              setTypeName(event.currentTarget.value);
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
            <h3 id={propertiesHeadingId} className={styles.sectionTitle}>
              {content.propertiesLabel}
            </h3>
            <p className={styles.sectionDescription}>
              {content.propertiesDescription}
            </p>
          </div>
          <button
            type="button"
            className={styles.addProperty}
            onClick={addProperty}
          >
            <PlusIcon />
            <span>{content.addPropertyLabel}</span>
          </button>
        </div>

        <ul className={styles.propertyList}>
          {fields.map((field, index) => (
            <li key={field.id}>
              <fieldset className={styles.propertyCard}>
                <VisuallyHidden as="legend">
                  {content.propertiesLabel} {index + 1}
                </VisuallyHidden>
                <div
                  className={styles.propertyGrid}
                  data-is-array={field.type === "array"}
                >
                  <label
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
                          duplicatePropertyNames.has(field.name.trim())
                          || invalidPropertyNameIds.has(field.id)
                        )
                          ? true
                          : undefined
                      }
                      aria-describedby={
                        (
                          duplicatePropertyNames.has(field.name.trim())
                          || invalidPropertyNameIds.has(field.id)
                        )
                          ? validationErrorId
                          : undefined
                      }
                      pattern={typeScriptIdentifierPattern.source}
                      title={content.identifierHint}
                      placeholder={content.propertyNamePlaceholder}
                      value={field.name}
                      onChange={(event) => {
                        updateProperty(field.id, {
                          name: event.currentTarget.value,
                        });
                      }}
                    />
                  </label>

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
                        onSelect: () => {
                          updateProperty(field.id, { type });
                        },
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
                            onSelect: () => {
                              updateProperty(field.id, {
                                arrayItemType: type,
                              });
                            },
                          } satisfies SelectMenuOption))}
                          rounded
                          selectedId={field.arrayItemType}
                          width="field"
                        />
                      </>
                    ) : null}
                  </div>

                  <CheckboxWithLabel
                    className={styles.checkboxField}
                    label={content.optionalLabel}
                    name={`property-${field.id}-optional`}
                    checked={field.optional}
                    onChange={(event) => {
                      updateProperty(field.id, {
                        optional: event.currentTarget.checked,
                      });
                    }}
                  />

                  <IconButton
                    type="button"
                    className={styles.removeProperty}
                    aria-label={`${content.removePropertyLabel} ${index + 1}`}
                    onClick={() => removeProperty(field.id)}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
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
