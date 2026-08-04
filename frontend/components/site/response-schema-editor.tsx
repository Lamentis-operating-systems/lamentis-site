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
  inferApiResponseSchemaFromJson,
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

type ParameterDraft = ApiRouteParameter & { id: number };
type ResponseHeaderDraft = ApiRouteHeader & { id: number };
type ResponseDraft = {
  contentTypes: string;
  description: string;
  headers: ResponseHeaderDraft[];
  id: number;
  json: string;
  original?: ApiRouteResponse;
  paginated: boolean;
  status: string;
};
type JsonIssue = "request" | number | null;
type SecurityMode = "inherit" | ApiSecurityScheme;

const bodyMethods: readonly HttpMethod[] = ["POST", "PUT", "PATCH"];
const additionalResponseStatuses = ["400", "401", "403", "404", "409", "422", "500"];

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

function prettyJson(value: ApiContractExample | undefined): string {
  return value === undefined ? "" : JSON.stringify(value, null, 2);
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
): ResponseDraft {
  return {
    contentTypes: response.contentTypes.join(", "),
    description: response.description,
    headers: (response.headers ?? []).map((header, headerId) => ({
      ...header,
      id: headerId,
    })),
    id,
    json: prettyJson(response.example),
    original: response,
    paginated: response.paginated === true,
    status: response.status,
  };
}

function hasResponsePayload(response: ResponseDraft): boolean {
  return Boolean(
    response.json.trim()
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
        aria-label={`${label}: ${open ? collapseLabel : expandLabel}`}
        onClick={onToggle}
      >
        <span className={styles.sectionHeader}>
          <span id={headingId} className={styles.sectionTitle}>{label}</span>
          <span className={styles.sectionDescription}>{description}</span>
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
  onRouteMethodChange,
  onSave,
  route,
  routeInputContent,
}: ResponseSchemaEditorProps) {
  const initialSuggestions = deriveApiRouteSuggestions(route.method, route.path);
  const initialRequestJson = prettyJson(route.requestBody?.example);
  const initialResponseValues = initialResponses(
    route,
    initialSuggestions.responseStatus,
    content.routeContract.defaultResponseDescription,
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
  const [requestJson, setRequestJson] = useState(initialRequestJson);
  const [requestRequired, setRequestRequired] = useState(
    route.requestBody?.required ?? true,
  );
  const [requestContentTypes, setRequestContentTypes] = useState(
    route.requestBody?.contentTypes.join(", ") ?? "application/json",
  );
  const [responses, setResponses] = useState<ResponseDraft[]>(() => (
    initialResponseValues.map(responseDraft)
  ));
  const [primaryResponseId] = useState(() => Math.max(
    0,
    initialResponseValues.findIndex((response) => /^2[0-9]{2}$/.test(response.status)),
  ));
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
  const primaryResponseEditsRef = useRef({
    json: false,
    pagination: false,
    status: false,
  });
  const securityEditedRef = useRef(false);
  const requestInputRef = useRef<HTMLTextAreaElement>(null);
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

  function toggleAdvanced() {
    if (advancedOpen) {
      const invalidControl = document.getElementById(formId)
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
      if (response.status !== next.responseStatus) {
        primaryResponseEditsRef.current.status = true;
      }
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
        headers: [],
        id: nextResponseIdRef.current++,
        json: "",
        paginated: false,
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
            if (response.id === primaryResponseId) {
              primaryResponseEditsRef.current.status = true;
            }
            updateResponse(response.id, {
              status: event.currentTarget.value,
            });
          }}
        />
      </label>
    );
  }

  function renderResponseJson(response: ResponseDraft, index: number) {
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
        error={jsonIssue === response.id
          ? content.routeContract.invalidExampleError
          : undefined}
        formatLabel={content.formatJsonLabel}
        label={label}
        name={`response-${response.id}-json`}
        placeholder={'{\n  "id": "user_123",\n  "name": "Ada"\n}'}
        tone="nested"
        value={response.json}
        onInvalidFormat={() => {
          setJsonIssue(response.id);
        }}
        onValueChange={(value) => {
          if (jsonIssue === response.id) setJsonIssue(null);
          if (response.id === primaryResponseId) {
            primaryResponseEditsRef.current.json = true;
          }
          updateResponse(response.id, { json: value });
        }}
      />
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
        <CheckboxWithLabel
          checked={response.paginated}
          disabled={response.status === "204"}
          label={`${content.routeContract.paginationLabel} ${index + 1}`}
          onChange={(event) => {
            if (response.id === primaryResponseId) {
              primaryResponseEditsRef.current.pagination = true;
            }
            updateResponse(response.id, {
              paginated: event.currentTarget.checked,
            });
          }}
        />
        {renderResponseHeaders(response, index)}
      </div>
    );
  }

  function normalizeResponse(
    response: ResponseDraft,
    parsed: JsonParseResult & { valid: true },
    primary: boolean,
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
    if (response.paginated) normalized.paginated = true;
    else delete normalized.paginated;
    if (response.json !== prettyJson(response.original?.example)) {
      if (parsed.value === undefined) {
        delete normalized.example;
        delete normalized.schema;
      } else {
        const existingTypeName = response.original?.schema?.typeName;
        normalized.example = parsed.value;
        normalized.schema = inferApiResponseSchemaFromJson(
          existingTypeName ?? contractTypeName(
            routeMethod,
            routePath,
            responseTypeSuffix(primary, response.status),
          ),
          parsed.value,
        );
        if (!normalized.schema) delete normalized.schema;
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
    const parsedRequest: JsonParseResult = showRequest
      ? parseJson(requestJson)
      : { valid: true };
    const parsedResponses = responses.map((response) => parseJson(response.json));
    if (!parsedRequest.valid || parsedResponses.some((result) => !result.valid)) {
      const invalidResponseIndex = parsedResponses.findIndex((result) => !result.valid);
      const invalidField = !parsedRequest.valid
        ? "request"
        : responses[invalidResponseIndex]?.id ?? null;
      setJsonIssue(invalidField);
      if (typeof invalidField === "number"
        && invalidField !== primaryResponseId) {
        setAdvancedOpen(true);
      }
      queueMicrotask(() => {
        if (invalidField === "request") requestInputRef.current?.focus();
        else if (typeof invalidField === "number") {
          const field = form.elements.namedItem(`response-${invalidField}-json`);
          if (field instanceof HTMLElement) field.focus();
        }
      });
      return;
    }

    const normalizedResponses = responses.map((response, index) => (
      normalizeResponse(
        response,
        parsedResponses[index] as JsonParseResult & { valid: true },
        index === primaryResponseIndex,
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

    const requestJsonChanged = requestJson !== initialRequestJson;
    if (!showRequest && !route.requestBody && !route.request) {
      delete nextContract.request;
      delete nextContract.requestBody;
    } else if (requestJsonChanged && parsedRequest.value === undefined) {
      delete nextContract.request;
      delete nextContract.requestBody;
    } else if (parsedRequest.value !== undefined && requestJsonChanged) {
      const requestSchema = inferApiResponseSchemaFromJson(
        route.requestBody?.schema?.typeName
          ?? route.request?.typeName
          ?? contractTypeName(routeMethod, routePath, "Request"),
        parsedRequest.value,
      );
      if (requestSchema) nextContract.request = requestSchema;
      else delete nextContract.request;
      nextContract.requestBody = {
        contentTypes: commaSeparatedValues(requestContentTypes),
        example: parsedRequest.value,
        required: requestRequired,
        ...(requestSchema ? { schema: requestSchema } : {}),
      };
    } else if (route.requestBody) {
      nextContract.requestBody = {
        ...route.requestBody,
        contentTypes: commaSeparatedValues(requestContentTypes),
        required: requestRequired,
      };
    }

    nextContract.responses = normalizedResponses;
    const primaryCandidate = normalizedResponses[primaryResponseIndex];
    const primaryResponse = primaryCandidate?.schema
      && /^2[0-9]{2}$/.test(primaryCandidate.status)
      ? primaryCandidate
      : undefined;
    const primaryResponseEdits = primaryResponseEditsRef.current;
    if (primaryResponse?.schema) nextContract.response = primaryResponse.schema;
    else if (primaryResponseEdits.json || primaryResponseEdits.status) {
      delete nextContract.response;
    }
    if (primaryResponse?.paginated) nextContract.paginated = true;
    else if (primaryResponseEdits.pagination || primaryResponseEdits.status) {
      delete nextContract.paginated;
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
          ref={requestInputRef}
          accessory={(
            <CheckboxWithLabel
              checked={requestRequired}
              label={content.routeContract.requestRequiredLabel}
              onChange={(event) => setRequestRequired(event.currentTarget.checked)}
            />
          )}
          description={content.requestBodyDescription}
          error={jsonIssue === "request"
            ? content.routeContract.invalidExampleError
            : undefined}
          formatLabel={content.formatJsonLabel}
          label={content.requestBodyLabel}
          name="request-json"
          placeholder={'{\n  "name": "Ada"\n}'}
          tone="nested"
          value={requestJson}
          onInvalidFormat={() => {
            setJsonIssue("request");
          }}
          onValueChange={(value) => {
            if (jsonIssue === "request") setJsonIssue(null);
            setIssue(null);
            setRequestJson(value);
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
          ) : renderResponseJson(primaryResponseDraft, primaryResponseIndex)}
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
            <LabeledInput
              label={content.routeContract.requestContentTypesLabel}
              name="request-content-types"
              placeholder={content.routeContract.contentTypesHint}
              required={Boolean(route.requestBody || requestJson.trim())}
              value={requestContentTypes}
              onChange={(event) => setRequestContentTypes(event.currentTarget.value)}
            />
          ) : null}

          {responses.map((response, index) => {
            const primary = index === primaryResponseIndex;
            return (
              <div
                key={response.id}
                className={styles.advancedResponseCard}
                role="group"
                aria-label={`${content.responseSectionLabel} ${index + 1}`}
              >
                <div className={styles.subsectionHeader}>
                  <span className={styles.label}>
                    {content.responseSectionLabel} {index + 1}
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
                {!primary ? renderResponseJson(response, index) : null}
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
