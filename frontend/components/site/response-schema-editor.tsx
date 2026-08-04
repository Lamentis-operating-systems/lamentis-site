"use client";

import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  apiResponseSchemaFromJsonSchema,
  apiResponseSchemaToJsonSchema,
  type ApiResponseSchema,
} from "@/domain/site/api-response-schema";
import {
  apiParameterTypes,
  apiSecuritySchemes,
  type ApiContractExample,
  type ApiParameterLocation,
  type ApiParameterType,
  type ApiRouteContract,
  type ApiRouteHeader,
  type ApiRouteParameter,
  type ApiRouteResponse,
  type ApiRouteSecurity,
  type ApiSecurityScheme,
  type HttpMethod,
} from "@/domain/site/api-route";
import {
  deriveApiRouteSuggestions,
  synchronizePathParameters,
} from "@/domain/site/api-route-suggestions";
import type { ApiRouteWorkspaceSaveResult } from "@/domain/site/api-route-workspace";
import type { ResponseSchemaEditorContent } from "@/domain/site/content";
import { ApiRouteInputBar } from "./api-route-input-bar";
import type { BracedPathValidationReason } from "./braced-path-input";
import { CheckboxWithLabel } from "./form/checkbox-with-label";
import { JsonInput } from "./form/json-input";
import { TextInput } from "./form/text-input";
import { IconButton } from "./icon-button";
import { ChevronIcon } from "./icons/chevron-icon";
import { CloseIcon } from "./icons/close-icon";
import { PlusIcon } from "./icons/plus-icon";
import { SelectMenu, type SelectMenuOption } from "./select-menu";
import styles from "./response-schema-editor.module.css";

type ResponseSchemaEditorProps = {
  content: ResponseSchemaEditorContent;
  disabledRouteMethods?: readonly HttpMethod[];
  formId: string;
  getRouteValidationReason: (
    method: HttpMethod,
    path: string,
  ) => BracedPathValidationReason | null;
  initializeEmptyResponseSchema?: boolean;
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

type JsonParseResult =
  | { value?: ApiContractExample; valid: true }
  | { valid: false };
type SchemaParseResult =
  | { value?: ApiResponseSchema; valid: true }
  | { reason: "json" | "schema"; valid: false };

type ParameterDraft = ApiRouteParameter & { id: number };
type ResponseHeaderDraft = ApiRouteHeader & { id: number };
type ResponseDraft = {
  contentTypes: string;
  description: string;
  exampleJson: string;
  headers: ResponseHeaderDraft[];
  id: number;
  initialPaginated: boolean;
  initialSchema?: ApiResponseSchema;
  original?: ApiRouteResponse;
  paginated: boolean;
  schemaGenerated: boolean;
  schemaJson: string;
  status: string;
};
type JsonIssue = {
  input: "example" | "schema";
  reason: "json" | "schema";
  target: "request" | number;
} | null;
type SecurityMode = "inherit" | ApiSecurityScheme;

const bodyMethods: readonly HttpMethod[] = ["POST", "PUT", "PATCH"];
const additionalResponseStatuses = ["400", "401", "403", "404", "409", "422", "500"];
const emptyJsonObjectSchema = [
  "{",
  '  "type": "object",',
  '  "properties": {',
  "    ",
  "  }",
  "}",
].join("\n");
const formattedEmptyJsonObjectSchema = `{
  "type": "object",
  "properties": {}
}`;
const jsonSchemaPlaceholder = `{
  "type": "object",
  "properties": {
    "id": { "type": "string" }
  },
  "required": ["id"]
}`;

function jsonIssueFieldName(issue: NonNullable<JsonIssue>): string {
  return issue.target === "request"
    ? `request-${issue.input}`
    : `response-${issue.target}-${issue.input}`;
}

function parseJson(value: string): JsonParseResult {
  if (!value.trim()) return { valid: true };
  try {
    return {
      value: JSON.parse(value) as ApiContractExample,
      valid: true,
    };
  } catch {
    return { valid: false };
  }
}

function parseSchemaJson(
  value: string,
  typeName: string,
  initialValue: string,
  initialSchema?: ApiResponseSchema,
): SchemaParseResult {
  if (!value.trim()) return { valid: true };
  if (value === initialValue && initialSchema) {
    return { valid: true, value: initialSchema };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return { reason: "json", valid: false };
  }
  const schema = apiResponseSchemaFromJsonSchema(
    typeName,
    parsed,
    initialSchema,
  );
  return schema
    ? { valid: true, value: schema }
    : { reason: "schema", valid: false };
}

function prettyJson(value: ApiContractExample | undefined): string {
  return value === undefined ? "" : JSON.stringify(value, null, 2);
}

function prettySchemaJson(value: ApiResponseSchema | undefined): string {
  return value === undefined
    ? ""
    : JSON.stringify(apiResponseSchemaToJsonSchema(value), null, 2);
}

function commaSeparatedValues(value: string): string[] {
  return [...new Set(
    value.split(",").map((item) => item.trim()).filter(Boolean),
  )];
}

function contractTypeName(
  method: HttpMethod,
  path: string,
  suffix: string,
): string {
  const segments = path.split("/").flatMap((segment) => {
    const parameter = segment.match(/^\{([A-Za-z0-9]+)\}$/)?.[1];
    return parameter ? ["by", parameter] : [segment];
  }).filter(Boolean);
  const words = [method.toLowerCase(), ...segments];
  const prefix = words.map((word) => (
    `${word.charAt(0).toUpperCase()}${word.slice(1)}`
  )).join("") || "Api";
  return `${prefix}${suffix}`;
}

function editableContract(
  route: ApiRouteContract,
): Omit<ApiRouteContract, "id" | "method" | "path"> {
  return Object.fromEntries(Object.entries(route).filter(([key]) => (
    key !== "id" && key !== "method" && key !== "path"
  ))) as Omit<ApiRouteContract, "id" | "method" | "path">;
}

function initialResponses(
  route: ApiRouteContract,
  defaultStatus: string,
  defaultDescription: string,
): ApiRouteResponse[] {
  if (route.responses?.length) return route.responses;
  if (route.response) {
    return [{
      contentTypes: ["application/json"],
      description: defaultDescription,
      ...(route.paginated ? { paginated: true } : {}),
      schema: route.response,
      status: "200",
    }];
  }
  return [{
    contentTypes: defaultStatus === "204" ? [] : ["application/json"],
    description: defaultDescription,
    status: defaultStatus,
  }];
}

function responseDraft(
  response: ApiRouteResponse,
  id: number,
  initialSchema = response.schema,
  initialPaginated = response.paginated === true,
  schemaJson = prettySchemaJson(initialSchema),
  schemaGenerated = false,
): ResponseDraft {
  return {
    contentTypes: response.contentTypes.join(", "),
    description: response.description,
    exampleJson: prettyJson(response.example),
    headers: (response.headers ?? []).map((header, headerId) => ({
      ...header,
      id: headerId,
    })),
    id,
    initialPaginated,
    ...(initialSchema ? { initialSchema } : {}),
    original: response,
    paginated: initialPaginated,
    schemaGenerated,
    schemaJson,
    status: response.status,
  };
}

function hasResponsePayload(response: ResponseDraft): boolean {
  return Boolean(
    response.exampleJson.trim()
    || (!response.schemaGenerated && response.schemaJson.trim())
    || response.original?.example !== undefined
    || response.original?.schema
    || response.paginated,
  );
}

function withoutDraftId<Value extends { id: number }>(
  value: Value,
): Omit<Value, "id"> {
  const normalized = { ...value };
  Reflect.deleteProperty(normalized, "id");
  return normalized;
}

function parameterWithType(
  parameter: ParameterDraft,
  type: ApiParameterType,
): ParameterDraft {
  return {
    ...parameter,
    maximum: type === "number" || type === "integer"
      ? parameter.maximum
      : undefined,
    maxLength: type === "string" ? parameter.maxLength : undefined,
    minimum: type === "number" || type === "integer"
      ? parameter.minimum
      : undefined,
    minLength: type === "string" ? parameter.minLength : undefined,
    pattern: type === "string" ? parameter.pattern : undefined,
    serialization: type === "array" && parameter.location === "query"
      ? (parameter.serialization ?? "repeat")
      : undefined,
    type,
  };
}

function responseTypeSuffix(primary: boolean, status: string): string {
  if (primary) return "Response";
  const normalizedStatus = status.replace(/[^A-Za-z0-9]+/g, "");
  return `Response${normalizedStatus || "Additional"}`;
}

function canMirrorResponse(status: string, schema?: ApiResponseSchema): boolean {
  return status !== "204" && /^2[0-9]{2}$/.test(status) && Boolean(schema);
}

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
  const descriptionId = useId();
  const panelId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <button
        type="button"
        className={styles.sectionToggle}
        aria-controls={panelId}
        aria-describedby={descriptionId}
        aria-expanded={open}
        aria-labelledby={headingId}
        title={open ? collapseLabel : expandLabel}
        onClick={onToggle}
      >
        <span className={styles.sectionHeader}>
          <span id={headingId} className={styles.sectionTitle}>{label}</span>
          <span id={descriptionId} className={styles.sectionDescription}>
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

function LabeledInput({
  fieldClassName,
  label,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof TextInput>, "tone"> & {
  fieldClassName?: string;
  label: string;
}) {
  return (
    <label
      className={[styles.field, fieldClassName ?? ""].filter(Boolean).join(" ")}
    >
      <span className={styles.label}>{label}</span>
      <TextInput
        {...props}
        placeholder={props.placeholder ?? label}
        tone="nested"
      />
    </label>
  );
}

export function ResponseSchemaEditor({
  content,
  disabledRouteMethods = [],
  formId,
  getRouteValidationReason,
  initializeEmptyResponseSchema = false,
  onRouteMethodChange,
  onSave,
  route,
  routeInputContent,
}: ResponseSchemaEditorProps) {
  const initialSuggestions = deriveApiRouteSuggestions(route.method, route.path);
  const initialRequestSchema = route.requestBody?.schema ?? route.request;
  const initialRequestSchemaJson = prettySchemaJson(initialRequestSchema);
  const initialRequestExampleJson = prettyJson(route.requestBody?.example);
  const initialRequestRequired = route.requestBody?.required ?? !route.request;
  const initialResponseValues = initialResponses(
    route,
    initialSuggestions.responseStatus,
    content.routeContract.defaultResponseDescription,
  );
  const initialPrimaryResponseIndex = Math.max(
    0,
    initialResponseValues.findIndex((response) => /^2[0-9]{2}$/.test(response.status)),
  );
  const [routeMethod, setRouteMethod] = useState(route.method);
  const [routePath, setRoutePath] = useState(route.path);
  const [title, setTitle] = useState(route.title ?? initialSuggestions.title);
  const [tags, setTags] = useState((route.tags ?? []).join(", "));
  const [description, setDescription] = useState(route.description ?? "");
  const [operationId, setOperationId] = useState(
    route.operationId ?? initialSuggestions.operationId,
  );
  const [deprecated, setDeprecated] = useState(route.deprecated === true);
  const [parameters, setParameters] = useState<ParameterDraft[]>(() => (
    (route.parameters ?? initialSuggestions.parameters).map((parameter, id) => ({
      ...parameter,
      id,
    }))
  ));
  const [requestSchemaJson, setRequestSchemaJson] = useState(
    initialRequestSchemaJson,
  );
  const [requestExampleJson, setRequestExampleJson] = useState(
    initialRequestExampleJson,
  );
  const [requestRequired, setRequestRequired] = useState(
    initialRequestRequired,
  );
  const [requestContentTypes, setRequestContentTypes] = useState(
    route.requestBody?.contentTypes.join(", ") ?? "application/json",
  );
  const [responses, setResponses] = useState<ResponseDraft[]>(() => (
    initialResponseValues.map((response, index) => {
      const generateSchema = initializeEmptyResponseSchema
        && index === initialPrimaryResponseIndex
        && !response.schema
        && !route.response;
      return responseDraft(
        response,
        index,
        response.schema ?? (index === initialPrimaryResponseIndex
          ? route.response
          : undefined),
        response.paginated ?? (index === initialPrimaryResponseIndex
          ? route.paginated === true
          : false),
        generateSchema ? emptyJsonObjectSchema : undefined,
        generateSchema,
      );
    })
  ));
  const [primaryResponseId] = useState(initialPrimaryResponseIndex);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [securityMode, setSecurityMode] = useState<SecurityMode>(
    route.security?.scheme ?? "inherit",
  );
  const [securityName, setSecurityName] = useState(route.security?.name ?? "");
  const [securityLocation, setSecurityLocation] = useState<
    Exclude<ApiParameterLocation, "path">
  >(route.security?.location ?? "header");
  const [securityScopes, setSecurityScopes] = useState(
    (route.security?.scopes ?? []).join(", "),
  );
  const [jsonIssue, setJsonIssue] = useState<JsonIssue>(null);
  const [issue, setIssue] = useState<"contract" | "duplicate" | null>(null);
  const [saveFailure, setSaveFailure] = useState<"route-conflict" | null>(null);
  const suggestionsRef = useRef(initialSuggestions);
  const nextParameterIdRef = useRef(parameters.length);
  const nextResponseIdRef = useRef(responses.length);
  const nextResponseHeaderIdRef = useRef(
    responses.reduce((maximum, response) => Math.max(
      maximum,
      ...response.headers.map((header) => header.id + 1),
    ), 0),
  );
  const securityEditedRef = useRef(false);
  const routeInputRef = useRef<HTMLInputElement>(null);
  const issueId = useId();
  const showRequest = bodyMethods.includes(routeMethod)
    || Boolean(route.requestBody || route.request);
  const commonParameters = parameters.filter((parameter) => (
    parameter.location === "path" || parameter.location === "query"
  ));
  const advancedParameters = parameters.filter((parameter) => (
    parameter.location === "header" || parameter.location === "cookie"
  ));
  const primaryResponseIndex = Math.max(0, responses.findIndex((response) => (
    response.id === primaryResponseId
  )));
  const primaryResponseDraft = responses[primaryResponseIndex];

  function clearIssues() {
    setJsonIssue(null);
    setIssue(null);
  }

  function jsonError(
    target: "request" | number,
    input: "example" | "schema",
  ): string | undefined {
    if (jsonIssue?.target !== target || jsonIssue.input !== input) return undefined;
    if (jsonIssue.reason === "schema") {
      return content.routeContract.invalidSchemaError;
    }
    return input === "schema"
      ? content.routeContract.invalidSchemaJsonError
      : content.routeContract.invalidExampleError;
  }

  function clearJsonError(
    target: "request" | number,
    input: "example" | "schema",
  ) {
    if (jsonIssue?.target === target && jsonIssue.input === input) {
      setJsonIssue(null);
    }
  }

  function toggleAdvanced() {
    if (advancedOpen) {
      const form = document.getElementById(formId);
      if (form instanceof HTMLFormElement && jsonIssue) {
        const jsonControl = form.elements.namedItem(jsonIssueFieldName(jsonIssue));
        if (
          jsonControl instanceof HTMLElement
          && jsonControl.closest("[data-advanced-settings]")
        ) {
          jsonControl.focus();
          return;
        }
      }
      const invalidControl = form
        ?.querySelector<HTMLElement>("[data-advanced-settings] :invalid");
      if (invalidControl) {
        invalidControl.focus();
        return;
      }
    }
    setAdvancedOpen((current) => !current);
  }

  function updateIdentity(nextMethod: HttpMethod, nextPath: string) {
    const previous = suggestionsRef.current;
    const next = deriveApiRouteSuggestions(nextMethod, nextPath);
    setTitle((current) => (
      !current || current === previous.title ? next.title : current
    ));
    setOperationId((current) => (
      !current || current === previous.operationId ? next.operationId : current
    ));
    setParameters((current) => {
      const synchronized = synchronizePathParameters(
        current.map(withoutDraftId),
        nextPath,
      );
      return synchronized.map((parameter) => {
        const existing = current.find((candidate) => (
          candidate.location === parameter.location
          && candidate.name === parameter.name
        ));
        return existing ?? { ...parameter, id: nextParameterIdRef.current++ };
      });
    });
    setResponses((current) => current.map((response) => {
      const matchesGeneratedPrimary = response.id === primaryResponseId
        && response.status === previous.responseStatus;
      const wouldDiscardPayload = next.responseStatus === "204"
        && (hasResponsePayload(response) || Boolean(route.response || route.paginated));
      if (!matchesGeneratedPrimary || wouldDiscardPayload) return response;
      return {
        ...response,
        contentTypes: next.responseStatus === "204"
          ? response.contentTypes
          : response.contentTypes || "application/json",
        status: next.responseStatus,
      };
    }));
    suggestionsRef.current = next;
  }

  function addParameter(location: "query" | "header") {
    setParameters((current) => [
      ...current,
      {
        id: nextParameterIdRef.current++,
        location,
        name: "",
        required: false,
        type: "string",
      },
    ]);
    if (location === "header") setAdvancedOpen(true);
  }

  function updateParameter(id: number, patch: Partial<ApiRouteParameter>) {
    setParameters((current) => current.map((parameter) => (
      parameter.id === id ? { ...parameter, ...patch } : parameter
    )));
  }

  function updateParameterType(id: number, type: ApiParameterType) {
    setParameters((current) => current.map((parameter) => (
      parameter.id === id ? parameterWithType(parameter, type) : parameter
    )));
  }

  function removeParameter(id: number) {
    setParameters((current) => current.filter((parameter) => parameter.id !== id));
  }

  function updateResponse(id: number, patch: Partial<ResponseDraft>) {
    setIssue(null);
    setResponses((current) => current.map((response) => (
      response.id === id ? { ...response, ...patch } : response
    )));
  }

  function addResponse() {
    const usedStatuses = new Set(responses.map((response) => response.status));
    const status = additionalResponseStatuses.find((candidate) => (
      !usedStatuses.has(candidate)
    )) ?? "default";
    setResponses((current) => [
      ...current,
      {
        contentTypes: "application/json",
        description: content.routeContract.defaultErrorResponseDescription,
        exampleJson: "",
        headers: [],
        id: nextResponseIdRef.current++,
        initialPaginated: false,
        paginated: false,
        schemaGenerated: false,
        schemaJson: "",
        status,
      },
    ]);
    setAdvancedOpen(true);
  }

  function removeResponse(id: number) {
    if (responses.length === 1) return;
    setResponses((current) => current.filter((response) => response.id !== id));
  }

  function addResponseHeader(responseId: number) {
    const response = responses.find((candidate) => candidate.id === responseId);
    if (!response) return;
    updateResponse(responseId, {
      headers: [
        ...response.headers,
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

  function renderParameterRow(parameter: ParameterDraft, position: number) {
    const pathParameter = parameter.location === "path";
    const advancedParameter = parameter.location === "header"
      || parameter.location === "cookie";
    return (
      <div
        key={parameter.id}
        className={styles.parameterRow}
        role="group"
        aria-label={`${content.routeContract.parametersLabel} ${position}`}
      >
        <TextInput
          aria-label={`${content.routeContract.parameterNameLabel} ${position}`}
          name={`parameter-${parameter.id}-name`}
          pattern="[A-Za-z][A-Za-z0-9_-]*"
          placeholder={content.routeContract.parameterNameLabel}
          readOnly={pathParameter}
          required
          tone="nested"
          value={parameter.name}
          onChange={(event) => updateParameter(parameter.id, {
            name: event.currentTarget.value,
          })}
        />
        {advancedParameter ? (
          <SelectMenu
            height="large"
            label={`${content.routeContract.parameterLocationLabel} ${position}`}
            options={( ["header", "cookie"] as const).map((location) => ({
              id: location,
              kind: "action",
              label: content.routeContract.parameterLocationOptions[location],
              onSelect: () => updateParameter(parameter.id, {
                location,
                serialization: undefined,
              }),
            }))}
            rounded
            selectedId={parameter.location}
            width="field"
          />
        ) : (
          <span className={styles.parameterLocation}>
            {content.routeContract.parameterLocationOptions[parameter.location]}
          </span>
        )}
        <SelectMenu
          height="large"
          label={`${content.routeContract.parameterTypeLabel} ${position}`}
          options={apiParameterTypes.map((type) => ({
            id: type,
            kind: "action",
            label: content.routeContract.parameterTypeOptions[type],
            onSelect: () => updateParameterType(parameter.id, type),
          }))}
          rounded
          selectedId={parameter.type}
          width="field"
        />
        <CheckboxWithLabel
          checked={pathParameter || parameter.required}
          disabled={pathParameter}
          label={content.routeContract.requiredLabel}
          onChange={(event) => updateParameter(parameter.id, {
            required: event.currentTarget.checked,
          })}
        />
        {pathParameter ? (
          <span aria-hidden="true" className={styles.actionSpacer} />
        ) : (
          <IconButton
            aria-label={`${content.routeContract.removeParameterLabel} ${position}`}
            onClick={() => removeParameter(parameter.id)}
          >
            <CloseIcon />
          </IconButton>
        )}
      </div>
    );
  }

  function renderResponseStatus(response: ResponseDraft, index: number) {
    const label = index === primaryResponseIndex
      ? content.routeContract.responseStatusLabel
      : `${content.routeContract.responseStatusLabel} ${index + 1}`;
    return (
      <label className={styles.statusField}>
        <span className={styles.label}>{label}</span>
        <TextInput
          inputMode="numeric"
          name={`response-${response.id}-status`}
          pattern="(?:default|[1-5][0-9]{2})"
          required
          tone="nested"
          value={response.status}
          onChange={(event) => {
            updateResponse(response.id, {
              status: event.currentTarget.value,
            });
          }}
        />
      </label>
    );
  }

  function renderResponseSchema(response: ResponseDraft, index: number) {
    if (response.status === "204") return null;
    const label = index === primaryResponseIndex
      ? content.responseSectionLabel
      : `${content.responseSectionLabel} ${index + 1}`;
    return (
      <JsonInput
        accessory={index === primaryResponseIndex
          ? renderResponseStatus(response, index)
          : undefined}
        description={content.responseSectionDescription}
        error={jsonError(response.id, "schema")}
        formatAriaLabel={`${content.formatJsonLabel}: ${label}`}
        formatLabel={content.formatJsonLabel}
        label={label}
        name={`response-${response.id}-schema`}
        placeholder={jsonSchemaPlaceholder}
        rows={8}
        tone="nested"
        value={response.schemaJson}
        onInvalidFormat={() => {
          setJsonIssue({
            input: "schema",
            reason: "json",
            target: response.id,
          });
        }}
        onValueChange={(value) => {
          clearJsonError(response.id, "schema");
          updateResponse(response.id, {
            paginated: value.trim() ? response.paginated : false,
            schemaGenerated: response.schemaGenerated
              && (
                value === emptyJsonObjectSchema
                || value === formattedEmptyJsonObjectSchema
              ),
            schemaJson: value,
          });
        }}
      />
    );
  }

  function renderResponseExample(response: ResponseDraft, index: number) {
    if (response.status === "204") return null;
    const label = index === primaryResponseIndex
      ? content.responseExampleLabel
      : `${content.responseExampleLabel} ${index + 1}`;
    return (
      <JsonInput
        className={styles.wideField}
        description={content.responseExampleDescription}
        error={jsonError(response.id, "example")}
        formatAriaLabel={`${content.formatJsonLabel}: ${label}`}
        formatLabel={content.formatJsonLabel}
        label={label}
        name={`response-${response.id}-example`}
        placeholder={'{\n  "id": "user_123"\n}'}
        tone="nested"
        value={response.exampleJson}
        onInvalidFormat={() => {
          setJsonIssue({
            input: "example",
            reason: "json",
            target: response.id,
          });
        }}
        onValueChange={(value) => {
          clearJsonError(response.id, "example");
          updateResponse(response.id, { exampleJson: value });
        }}
      />
    );
  }

  function renderResponsePagination(response: ResponseDraft, index: number) {
    const primary = index === primaryResponseIndex;
    const descriptionId = primary
      ? `${issueId}-response-${response.id}-pagination-description`
      : undefined;
    const checkbox = (
      <CheckboxWithLabel
        aria-describedby={descriptionId}
        checked={response.paginated}
        disabled={response.status === "204" || !response.schemaJson.trim()}
        label={primary
          ? content.routeContract.paginationLabel
          : `${content.routeContract.paginationLabel} ${index + 1}`}
        name={`response-${response.id}-paginated`}
        onChange={(event) => {
          updateResponse(response.id, {
            paginated: event.currentTarget.checked,
          });
        }}
      />
    );
    if (!primary) return checkbox;
    return (
      <div className={styles.responseOption}>
        {checkbox}
        <p id={descriptionId} className={styles.sectionDescription}>
          {content.routeContract.paginationDescription}
        </p>
      </div>
    );
  }

  function renderResponseHeaders(response: ResponseDraft, responseIndex: number) {
    return (
      <div className={styles.advancedSubsection}>
        <div className={styles.subsectionHeader}>
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
              placeholder={content.routeContract.responseHeaderNameLabel}
              required
              tone="nested"
              value={header.name}
              onChange={(event) => updateResponseHeader(
                response.id,
                header.id,
                { name: event.currentTarget.value },
              )}
            />
            <SelectMenu
              height="large"
              label={`${content.routeContract.parameterTypeLabel} ${responseIndex + 1}.${headerIndex + 1}`}
              options={apiParameterTypes.map((type) => ({
                id: type,
                kind: "action",
                label: content.routeContract.parameterTypeOptions[type],
                onSelect: () => updateResponseHeader(
                  response.id,
                  header.id,
                  { type },
                ),
              }))}
              rounded
              selectedId={header.type}
              width="field"
            />
            <TextInput
              aria-label={`${content.routeContract.responseHeaderDescriptionLabel} ${responseIndex + 1}.${headerIndex + 1}`}
              name={`response-${response.id}-header-${header.id}-description`}
              placeholder={content.routeContract.responseHeaderDescriptionLabel}
              tone="nested"
              value={header.description ?? ""}
              onChange={(event) => updateResponseHeader(
                response.id,
                header.id,
                { description: event.currentTarget.value },
              )}
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
    );
  }

  function renderResponseAdvanced(response: ResponseDraft, index: number) {
    return (
      <div className={styles.responseAdvanced}>
        {renderResponseExample(response, index)}
        <LabeledInput
          label={`${content.routeContract.responseDescriptionLabel} ${index + 1}`}
          name={`response-${response.id}-description`}
          required
          value={response.description}
          onChange={(event) => updateResponse(response.id, {
            description: event.currentTarget.value,
          })}
        />
        <LabeledInput
          label={`${content.routeContract.responseContentTypesLabel} ${index + 1}`}
          name={`response-${response.id}-content-types`}
          placeholder={content.routeContract.contentTypesHint}
          required={response.status !== "204"}
          value={response.contentTypes}
          onChange={(event) => updateResponse(response.id, {
            contentTypes: event.currentTarget.value,
          })}
        />
        {index === primaryResponseIndex
          ? null
          : renderResponsePagination(response, index)}
        {renderResponseHeaders(response, index)}
      </div>
    );
  }

  function normalizeResponse(
    response: ResponseDraft,
    parsedSchema: SchemaParseResult & { valid: true },
    parsedExample: JsonParseResult & { valid: true },
  ): ApiRouteResponse {
    const normalizedHeaders = response.headers
      .filter((header) => header.name.trim())
      .map((header): ApiRouteHeader => {
        const normalized = withoutDraftId(header);
        normalized.name = normalized.name.trim();
        if (normalized.description?.trim()) {
          normalized.description = normalized.description.trim();
        } else {
          delete normalized.description;
        }
        return normalized;
      });
    const normalized: ApiRouteResponse = {
      ...(response.original ?? {}),
      contentTypes: commaSeparatedValues(response.contentTypes),
      description: response.description.trim(),
      ...(normalizedHeaders.length > 0 ? { headers: normalizedHeaders } : {}),
      status: response.status.trim(),
    };
    if (normalizedHeaders.length === 0) delete normalized.headers;
    if (response.status.trim() === "204") {
      normalized.contentTypes = [];
      delete normalized.example;
      delete normalized.paginated;
      delete normalized.schema;
      return normalized;
    }
    if (response.paginated !== response.initialPaginated) {
      if (response.paginated) {
        normalized.paginated = true;
        if (!normalized.schema && parsedSchema.value) {
          normalized.schema = parsedSchema.value;
        }
      } else {
        delete normalized.paginated;
      }
    }
    if (parsedSchema.value !== response.initialSchema) {
      if (parsedSchema.value === undefined) {
        delete normalized.schema;
      } else {
        normalized.schema = parsedSchema.value;
      }
    }
    if (response.exampleJson !== prettyJson(response.original?.example)) {
      if (parsedExample.value === undefined) {
        delete normalized.example;
      } else {
        normalized.example = parsedExample.value;
      }
    }
    return normalized;
  }

  function normalizedSecurity(): ApiRouteSecurity | undefined {
    if (securityMode === "inherit") return undefined;
    if (securityMode === "none") return { scheme: "none" };
    if (securityMode === "apiKey" || securityMode === "cookie") {
      return {
        location: securityMode === "cookie" ? "cookie" : securityLocation,
        name: securityName.trim(),
        scheme: securityMode,
      };
    }
    if (securityMode === "oauth2") {
      const scopes = commaSeparatedValues(securityScopes);
      return { scheme: securityMode, ...(scopes.length ? { scopes } : {}) };
    }
    return { scheme: securityMode };
  }

  function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsedRequestSchema: SchemaParseResult = showRequest
      ? parseSchemaJson(
          requestSchemaJson,
          initialRequestSchema?.typeName
            ?? contractTypeName(routeMethod, routePath, "Request"),
          initialRequestSchemaJson,
          initialRequestSchema,
        )
      : { valid: true };
    const parsedRequestExample: JsonParseResult = showRequest
      ? parseJson(requestExampleJson)
      : { valid: true };
    const parsedResponseSchemas = responses.map((response, index) => (
      parseSchemaJson(
        response.schemaJson,
        response.initialSchema?.typeName ?? contractTypeName(
          routeMethod,
          routePath,
          responseTypeSuffix(index === primaryResponseIndex, response.status),
        ),
        prettySchemaJson(response.initialSchema),
        response.initialSchema,
      )
    ));
    const parsedResponseExamples = responses.map((response) => (
      parseJson(response.exampleJson)
    ));
    let invalidJsonIssue: JsonIssue = null;
    if (!parsedRequestSchema.valid) {
      invalidJsonIssue = {
        input: "schema",
        reason: parsedRequestSchema.reason,
        target: "request",
      };
    } else if (!parsedRequestExample.valid) {
      invalidJsonIssue = {
        input: "example",
        reason: "json",
        target: "request",
      };
    } else {
      for (let index = 0; index < responses.length; index += 1) {
        const parsedSchema = parsedResponseSchemas[index];
        const parsedExample = parsedResponseExamples[index];
        const response = responses[index];
        if (!response) continue;
        if (parsedSchema && !parsedSchema.valid) {
          invalidJsonIssue = {
            input: "schema",
            reason: parsedSchema.reason,
            target: response.id,
          };
          break;
        }
        if (parsedExample && !parsedExample.valid) {
          invalidJsonIssue = {
            input: "example",
            reason: "json",
            target: response.id,
          };
          break;
        }
      }
    }
    if (invalidJsonIssue) {
      setJsonIssue(invalidJsonIssue);
      if (
        invalidJsonIssue.input === "example"
        || (typeof invalidJsonIssue.target === "number"
          && invalidJsonIssue.target !== primaryResponseId)
      ) {
        setAdvancedOpen(true);
      }
      queueMicrotask(() => {
        const field = form.elements.namedItem(jsonIssueFieldName(invalidJsonIssue));
        if (field instanceof HTMLElement) field.focus();
      });
      return;
    }

    const normalizedResponses = responses.map((response, index) => (
      normalizeResponse(
        response,
        parsedResponseSchemas[index] as SchemaParseResult & { valid: true },
        parsedResponseExamples[index] as JsonParseResult & { valid: true },
      )
    ));
    if (new Set(normalizedResponses.map(({ status }) => status)).size
      !== normalizedResponses.length) {
      setIssue("duplicate");
      setAdvancedOpen(true);
      return;
    }

    const nextContract = editableContract(route);
    const normalizedParameters = parameters
      .filter((parameter) => parameter.name.trim())
      .map((parameter) => ({
        ...withoutDraftId(parameter),
        name: parameter.name.trim(),
        required: parameter.location === "path" ? true : parameter.required,
      }));
    nextContract.title = title.trim() || suggestionsRef.current.title;
    if (description.trim()) nextContract.description = description.trim();
    else delete nextContract.description;
    if (operationId.trim()) nextContract.operationId = operationId.trim();
    else delete nextContract.operationId;
    const normalizedTags = commaSeparatedValues(tags);
    if (normalizedTags.length) nextContract.tags = normalizedTags;
    else delete nextContract.tags;
    if (deprecated) nextContract.deprecated = true;
    else delete nextContract.deprecated;
    nextContract.parameters = synchronizePathParameters(
      normalizedParameters,
      routePath,
    );
    if (securityEditedRef.current) {
      const security = normalizedSecurity();
      if (security) nextContract.security = security;
      else delete nextContract.security;
    }

    const parsedRequestSchemaValue = (
      parsedRequestSchema as SchemaParseResult & { valid: true }
    ).value;
    const requestSchemaChanged = parsedRequestSchemaValue !== initialRequestSchema;
    const requestExampleChanged = requestExampleJson !== initialRequestExampleJson;
    const requestSettingsChanged = (
      requestContentTypes !== (
        route.requestBody?.contentTypes.join(", ") ?? "application/json"
      )
      || requestRequired !== initialRequestRequired
    );
    if (!showRequest && !route.requestBody && !route.request) {
      delete nextContract.request;
      delete nextContract.requestBody;
    } else {
      const parsedSchema = parsedRequestSchema as SchemaParseResult & { valid: true };
      const parsedExample = parsedRequestExample as JsonParseResult & { valid: true };
      if (requestSchemaChanged) {
        if (parsedSchema.value) nextContract.request = parsedSchema.value;
        else delete nextContract.request;
      }
      const requestBody = {
        ...(route.requestBody ?? {}),
        contentTypes: commaSeparatedValues(requestContentTypes),
        required: requestRequired,
      };
      if (requestSchemaChanged) {
        if (parsedSchema.value) requestBody.schema = parsedSchema.value;
        else delete requestBody.schema;
      }
      if (
        !route.requestBody
        && (requestExampleChanged || requestSettingsChanged)
        && parsedSchema.value
      ) {
        requestBody.schema = parsedSchema.value;
      }
      if (requestExampleChanged) {
        if (parsedExample.value !== undefined) {
          requestBody.example = parsedExample.value;
        } else {
          delete requestBody.example;
        }
      }
      if (
        route.requestBody
        || requestBody.schema !== undefined
        || requestBody.example !== undefined
        || requestSettingsChanged
      ) {
        nextContract.requestBody = requestBody;
      } else {
        delete nextContract.requestBody;
      }
    }

    nextContract.responses = normalizedResponses;
    const primaryParsedSchema = parsedResponseSchemas[primaryResponseIndex];
    const primarySchema = primaryParsedSchema?.valid
      ? primaryParsedSchema.value
      : undefined;
    const primarySchemaChanged = primaryResponseDraft
      ? primarySchema !== primaryResponseDraft.initialSchema
      : false;
    const initialPrimaryCanMirror = primaryResponseDraft
      ? canMirrorResponse(
          primaryResponseDraft.original?.status ?? "",
          primaryResponseDraft.initialSchema,
        )
      : false;
    const nextPrimaryCanMirror = primaryResponseDraft
      ? canMirrorResponse(primaryResponseDraft.status, primarySchema)
      : false;
    const primaryMirrorEligibilityChanged =
      initialPrimaryCanMirror !== nextPrimaryCanMirror;
    const primaryPaginationChanged = primaryResponseDraft
      ? primaryResponseDraft.paginated
        !== primaryResponseDraft.initialPaginated
      : false;
    if (primarySchemaChanged || primaryMirrorEligibilityChanged) {
      if (nextPrimaryCanMirror && primarySchema) {
        nextContract.response = primarySchema;
      }
      else delete nextContract.response;
    }
    if (primaryPaginationChanged || primaryMirrorEligibilityChanged) {
      if (nextPrimaryCanMirror && primaryResponseDraft?.paginated) {
        nextContract.paginated = true;
      }
      else delete nextContract.paginated;
    }

    const result = onSave(nextContract, { method: routeMethod, path: routePath });
    if (result === "route-conflict") {
      setSaveFailure("route-conflict");
      queueMicrotask(() => routeInputRef.current?.focus());
    } else if (result === "schema-conflict" || result === "contract-invalid") {
      setIssue("contract");
      setAdvancedOpen(true);
    }
  }

  const securityNeedsName = securityMode === "apiKey" || securityMode === "cookie";
  const issueMessage = issue === "duplicate"
    ? content.routeContract.duplicateResponseStatusError
    : issue === "contract"
      ? content.routeContract.invalidContractError
      : null;

  return (
    <form
      id={formId}
      className={styles.form}
      onInvalid={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)
          || !target.closest("[data-advanced-settings]")) return;
        setAdvancedOpen(true);
        queueMicrotask(() => target.focus());
      }}
      onSubmit={submitContract}
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
          updateIdentity(nextMethod, routePath);
          setRouteMethod(nextMethod);
          setSaveFailure(null);
          clearIssues();
          onRouteMethodChange?.(nextMethod);
        }}
        onPathChange={(nextPath) => {
          updateIdentity(routeMethod, nextPath);
          setRoutePath(nextPath);
          setSaveFailure(null);
          clearIssues();
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

      <section className={styles.section} aria-labelledby={`${issueId}-parameters`}>
        <div className={styles.subsectionHeader}>
          <div className={styles.sectionHeader}>
            <h3 id={`${issueId}-parameters`} className={styles.sectionTitle}>
              {content.routeContract.parametersLabel}
            </h3>
            <p className={styles.sectionDescription}>
              {content.routeContract.parametersDescription}
            </p>
          </div>
          <IconButton
            aria-label={content.routeContract.addQueryParameterLabel}
            onClick={() => addParameter("query")}
          >
            <PlusIcon />
          </IconButton>
        </div>
        {commonParameters.length > 0 ? (
          <div className={styles.rows}>
            {commonParameters.map((parameter) => (
              renderParameterRow(
                parameter,
                parameters.findIndex(({ id }) => id === parameter.id) + 1,
              )
            ))}
          </div>
        ) : null}
      </section>

      {showRequest ? (
        <JsonInput
          accessory={(
            <CheckboxWithLabel
              checked={requestRequired}
              label={content.routeContract.requestRequiredLabel}
              onChange={(event) => setRequestRequired(event.currentTarget.checked)}
            />
          )}
          description={content.requestBodyDescription}
          error={jsonError("request", "schema")}
          formatAriaLabel={`${content.formatJsonLabel}: ${content.requestBodyLabel}`}
          formatLabel={content.formatJsonLabel}
          label={content.requestBodyLabel}
          name="request-schema"
          placeholder={jsonSchemaPlaceholder}
          rows={8}
          tone="nested"
          value={requestSchemaJson}
          onInvalidFormat={() => {
            setJsonIssue({
              input: "schema",
              reason: "json",
              target: "request",
            });
          }}
          onValueChange={(value) => {
            clearJsonError("request", "schema");
            setIssue(null);
            setRequestSchemaJson(value);
          }}
        />
      ) : null}

      {primaryResponseDraft ? (
        <section
          className={styles.responseCard}
          aria-label={content.responseSectionLabel}
        >
          {primaryResponseDraft.status === "204" ? (
            <div className={styles.noContentResponse}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>
                  {content.responseSectionLabel}
                </span>
                <span className={styles.sectionDescription}>
                  {content.responseSectionDescription}
                </span>
              </div>
              {renderResponseStatus(primaryResponseDraft, primaryResponseIndex)}
            </div>
          ) : (
            <>
              {renderResponseSchema(primaryResponseDraft, primaryResponseIndex)}
              {renderResponsePagination(primaryResponseDraft, primaryResponseIndex)}
            </>
          )}
        </section>
      ) : null}

      <ToggleSection
        collapseLabel={content.collapseSectionLabel}
        description={content.advancedDescription}
        expandLabel={content.expandSectionLabel}
        label={content.advancedLabel}
        open={advancedOpen}
        onToggle={toggleAdvanced}
      >
        <div className={styles.advancedContent} data-advanced-settings>
          <div className={styles.fieldGrid}>
            <LabeledInput
              label={content.routeContract.summaryLabel}
              name="route-summary"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
            <LabeledInput
              label={content.routeContract.tagsLabel}
              name="route-tags"
              placeholder={content.routeContract.tagsHint}
              value={tags}
              onChange={(event) => setTags(event.currentTarget.value)}
            />
            <LabeledInput
              fieldClassName={styles.wideField}
              label={content.routeContract.descriptionLabel}
              name="route-description"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
            <LabeledInput
              label={content.routeContract.operationIdLabel}
              name="operation-id"
              pattern="[A-Za-z_$][A-Za-z0-9_$]*"
              value={operationId}
              onChange={(event) => setOperationId(event.currentTarget.value)}
            />
            <CheckboxWithLabel
              checked={deprecated}
              label={content.routeContract.deprecatedLabel}
              onChange={(event) => setDeprecated(event.currentTarget.checked)}
            />
          </div>

          <div className={styles.advancedSubsection}>
            <div className={styles.subsectionHeader}>
              <div className={styles.sectionHeader}>
                <span className={styles.label}>
                  {content.routeContract.advancedParametersLabel}
                </span>
                <p className={styles.sectionDescription}>
                  {content.routeContract.advancedParametersDescription}
                </p>
              </div>
              <IconButton
                aria-label={content.routeContract.addHeaderParameterLabel}
                onClick={() => addParameter("header")}
              >
                <PlusIcon />
              </IconButton>
            </div>
            {advancedParameters.length > 0 ? (
              <div className={styles.rows}>
                {advancedParameters.map((parameter) => (
                  renderParameterRow(
                    parameter,
                    parameters.findIndex(({ id }) => id === parameter.id) + 1,
                  )
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.advancedSubsection}>
            <span className={styles.label}>
              {content.routeContract.authenticationLabel}
            </span>
            <div className={styles.fieldGrid}>
              <SelectMenu
                height="large"
                label={content.routeContract.securitySchemeLabel}
                options={(["inherit", ...apiSecuritySchemes] as const).map((scheme) => ({
                  id: scheme,
                  kind: "action",
                  label: content.routeContract.securitySchemeOptions[scheme],
                  onSelect: () => {
                    securityEditedRef.current = true;
                    setSecurityMode(scheme);
                    if (scheme === "cookie") setSecurityLocation("cookie");
                  },
                } satisfies SelectMenuOption))}
                rounded
                selectedId={securityMode}
                width="field"
              />
              {securityNeedsName ? (
                <LabeledInput
                  label={content.routeContract.authNameLabel}
                  name="security-name"
                  placeholder={content.routeContract.securityNameHint}
                  required
                  value={securityName}
                  onChange={(event) => {
                    securityEditedRef.current = true;
                    setSecurityName(event.currentTarget.value);
                  }}
                />
              ) : null}
              {securityNeedsName ? (
                <SelectMenu
                  height="large"
                  label={content.routeContract.authLocationLabel}
                  options={(securityMode === "cookie"
                    ? (["cookie"] as const)
                    : (["query", "header", "cookie"] as const)).map((location) => ({
                    id: location,
                    kind: "action",
                    label: content.routeContract.parameterLocationOptions[location],
                    onSelect: () => {
                      securityEditedRef.current = true;
                      setSecurityLocation(location);
                    },
                  }))}
                  rounded
                  selectedId={securityLocation}
                  width="field"
                />
              ) : null}
              {securityMode === "oauth2" ? (
                <LabeledInput
                  label={content.routeContract.securityScopesLabel}
                  name="security-scopes"
                  value={securityScopes}
                  onChange={(event) => {
                    securityEditedRef.current = true;
                    setSecurityScopes(event.currentTarget.value);
                  }}
                />
              ) : null}
            </div>
          </div>

          {showRequest ? (
            <div className={styles.advancedSubsection}>
              <JsonInput
                description={content.requestExampleDescription}
                error={jsonError("request", "example")}
                formatAriaLabel={`${content.formatJsonLabel}: ${content.requestExampleLabel}`}
                formatLabel={content.formatJsonLabel}
                label={content.requestExampleLabel}
                name="request-example"
                placeholder={'{\n  "name": "Ada"\n}'}
                tone="nested"
                value={requestExampleJson}
                onInvalidFormat={() => {
                  setJsonIssue({
                    input: "example",
                    reason: "json",
                    target: "request",
                  });
                }}
                onValueChange={(value) => {
                  clearJsonError("request", "example");
                  setRequestExampleJson(value);
                }}
              />
              <LabeledInput
                label={content.routeContract.requestContentTypesLabel}
                name="request-content-types"
                placeholder={content.routeContract.contentTypesHint}
                required={Boolean(
                  route.requestBody
                  || requestSchemaJson.trim()
                  || requestExampleJson.trim()
                )}
                value={requestContentTypes}
                onChange={(event) => setRequestContentTypes(event.currentTarget.value)}
              />
            </div>
          ) : null}

          {responses.map((response, index) => {
            const primary = index === primaryResponseIndex;
            return (
              <div
                key={response.id}
                className={styles.advancedResponseCard}
                role="group"
                aria-label={`${content.responseGroupLabel} ${index + 1}`}
              >
                <div className={styles.subsectionHeader}>
                  <span className={styles.label}>
                    {content.responseGroupLabel} {index + 1}
                  </span>
                  {!primary ? (
                    <IconButton
                      aria-label={`${content.routeContract.removeResponseLabel} ${index + 1}`}
                      onClick={() => removeResponse(response.id)}
                    >
                      <CloseIcon />
                    </IconButton>
                  ) : null}
                </div>
                {!primary ? renderResponseStatus(response, index) : null}
                {!primary ? renderResponseSchema(response, index) : null}
                {renderResponseAdvanced(response, index)}
              </div>
            );
          })}
          <button className={styles.addResponse} type="button" onClick={addResponse}>
            <PlusIcon />
            <span>{content.routeContract.addResponseLabel}</span>
          </button>
        </div>
      </ToggleSection>

      {issueMessage ? (
        <p id={issueId} className={styles.error} role="alert">
          {issueMessage}
        </p>
      ) : null}
    </form>
  );
}
