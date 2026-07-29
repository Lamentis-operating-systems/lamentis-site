"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  apiResponseArrayItemTypes,
  apiResponseFieldTypes,
  isValidApiResponseSchema,
  type ApiResponseArrayItemType,
  type ApiResponseFieldType,
  type ApiResponseSchema,
  typeScriptIdentifierPattern,
} from "@/domain/site/api-response-schema";
import type { ResponseSchemaEditorContent } from "@/domain/site/content";
import { PlusIcon } from "./navigation/plus-icon";
import { CloseIcon } from "./overlay/close-icon";
import styles from "./response-schema-editor.module.css";

type ResponseSchemaEditorProps = {
  content: ResponseSchemaEditorContent;
  formId: string;
  onSave: (schema: ApiResponseSchema) => void;
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
  formId,
  onSave,
}: ResponseSchemaEditorProps) {
  const [typeName, setTypeName] = useState("");
  const [fields, setFields] = useState<DraftField[]>([]);
  const [error, setError] = useState("");
  const nextFieldIdRef = useRef(0);

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
    setError("");
  }

  function updateProperty(id: number, patch: Partial<DraftField>) {
    setFields((currentFields) => currentFields.map((field) => (
      field.id === id ? { ...field, ...patch } : field
    )));
    setError("");
  }

  function removeProperty(id: number) {
    setFields((currentFields) => (
      currentFields.filter((field) => field.id !== id)
    ));
    setError("");
  }

  function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const schema: ApiResponseSchema = {
      fields: fields.map((field) => ({
        ...(field.type === "array"
          ? { arrayItemType: field.arrayItemType }
          : {}),
        name: field.name.trim(),
        optional: field.optional,
        type: field.type,
      })),
      typeName: typeName.trim(),
    };
    const names = schema.fields.map((field) => field.name);
    const duplicateName = new Set(names).size !== names.length;

    if (duplicateName) {
      setError(content.duplicatePropertyError);
      return;
    }

    if (!isValidApiResponseSchema(schema)) {
      setError(content.identifierHint);
      return;
    }

    onSave(schema);
  }

  return (
    <form
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
          onChange={(event) => {
            setTypeName(event.currentTarget.value);
            setError("");
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
              <legend className={styles.legend}>
                {content.propertiesLabel} {index + 1}
              </legend>
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

                <button
                  type="button"
                  className={styles.removeProperty}
                  aria-label={`${content.removePropertyLabel} ${index + 1}`}
                  onClick={() => removeProperty(field.id)}
                >
                  <CloseIcon />
                </button>
              </div>
            </fieldset>
          </li>
        ))}
      </ul>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
