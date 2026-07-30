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
  hasIncompatibleApiResponseSchema,
  isValidTypeScriptTypeName,
  isValidApiResponseSchema,
  type ApiResponseArrayItemType,
  type ApiResponseFieldType,
  type ApiResponseSchema,
  typeScriptIdentifierPattern,
} from "@/domain/site/api-response-schema";
import type { ResponseSchemaEditorContent } from "@/domain/site/content";
import { IconButton } from "./icon-button";
import { CloseIcon } from "./icons/close-icon";
import { PlusIcon } from "./icons/plus-icon";
import { VisuallyHidden } from "./visually-hidden";
import styles from "./response-schema-editor.module.css";

type ResponseSchemaEditorProps = {
  content: ResponseSchemaEditorContent;
  existingResponseSchemas: readonly ApiResponseSchema[];
  formId: string;
  onSave: (schema: ApiResponseSchema) => boolean;
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
  existingResponseSchemas,
  formId,
  onSave,
}: ResponseSchemaEditorProps) {
  const [typeName, setTypeName] = useState("");
  const [fields, setFields] = useState<DraftField[]>([]);
  const [error, setError] = useState("");
  const [saveRejectedForConflict, setSaveRejectedForConflict] =
    useState(false);
  const validationErrorId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const nextFieldIdRef = useRef(0);
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
      <label className={styles.fieldGroup}>
        <span className={styles.label}>{content.responseTypeLabel}</span>
        <input
          className={styles.control}
          type="text"
          name="responseType"
          autoComplete="off"
          spellCheck={false}
          required
          pattern={typeScriptIdentifierPattern.source}
          title={content.identifierHint}
          placeholder={content.responseTypePlaceholder}
          value={typeName}
          aria-invalid={
            hasInvalidTypeName || hasResponseTypeConflict ? true : undefined
          }
          aria-describedby={
            hasInvalidTypeName || hasResponseTypeConflict
              ? validationErrorId
              : undefined
          }
          onChange={(event) => {
            setTypeName(event.currentTarget.value);
            clearValidationError();
          }}
        />
      </label>

      <div className={styles.propertiesHeader}>
        <span className={styles.sectionTitle}>{content.propertiesLabel}</span>
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
              <div className={styles.propertyGrid}>
                <label className={styles.fieldGroup}>
                  <span className={styles.label}>
                    {content.propertyNameLabel}
                  </span>
                  <input
                    className={styles.control}
                    type="text"
                    name={`property-${field.id}-name`}
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

                <label className={styles.fieldGroup}>
                  <span className={styles.label}>
                    {content.propertyTypeLabel}
                  </span>
                  <select
                    className={styles.control}
                    name={`property-${field.id}-type`}
                    value={field.type}
                    onChange={(event) => {
                      updateProperty(field.id, {
                        type: event.currentTarget.value as ApiResponseFieldType,
                      });
                    }}
                  >
                    {apiResponseFieldTypes.map((type) => (
                      <option key={type} value={type}>
                        {content.typeOptions[type]}
                      </option>
                    ))}
                  </select>
                </label>

                {field.type === "array" ? (
                  <label className={styles.fieldGroup}>
                    <span className={styles.label}>
                      {content.arrayItemTypeLabel}
                    </span>
                    <select
                      className={styles.control}
                      name={`property-${field.id}-array-item-type`}
                      value={field.arrayItemType}
                      onChange={(event) => {
                        updateProperty(field.id, {
                          arrayItemType: event.currentTarget
                            .value as ApiResponseArrayItemType,
                        });
                      }}
                    >
                      {apiResponseArrayItemTypes.map((type) => (
                        <option key={type} value={type}>
                          {content.typeOptions[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : <span aria-hidden="true" />}

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name={`property-${field.id}-optional`}
                    checked={field.optional}
                    onChange={(event) => {
                      updateProperty(field.id, {
                        optional: event.currentTarget.checked,
                      });
                    }}
                  />
                  <span>{content.optionalLabel}</span>
                </label>

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
