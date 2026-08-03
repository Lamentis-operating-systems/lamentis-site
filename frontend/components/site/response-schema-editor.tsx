"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  inferApiResponseSchemaFromJson,
  type ApiResponseSchema,
} from "@/domain/site/api-response-schema";
import {
  type ApiContractExample,
  type ApiRouteContract,
  type ApiRouteResponse,
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
import { TextArea } from "./form/text-area";
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

const bodyMethods: readonly HttpMethod[] = ["POST", "PUT", "PATCH"];
const commonResponseStatuses = ["200", "201", "202", "204"] as const;

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

function contractTypeName(
  method: HttpMethod,
  path: string,
  suffix: "Request" | "Response",
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

function primaryResponse(route: ApiRouteContract): ApiRouteResponse | undefined {
  return route.responses?.find((response) => /^2[0-9]{2}$/.test(response.status))
    ?? route.responses?.[0]
    ?? (route.response ? {
      contentTypes: ["application/json"],
      description: "Successful response",
      ...(route.paginated ? { paginated: true } : {}),
      schema: route.response,
      status: "200",
    } : undefined);
}

function withSchema(
  response: ApiRouteResponse,
  schema: ApiResponseSchema | undefined,
): ApiRouteResponse {
  const withoutSchema = { ...response };
  delete withoutSchema.schema;
  return schema ? { ...withoutSchema, schema } : withoutSchema;
}

function editableContract(
  route: ApiRouteContract,
): Omit<ApiRouteContract, "id" | "method" | "path"> {
  return Object.fromEntries(Object.entries(route).filter(([key]) => (
    key !== "id" && key !== "method" && key !== "path"
  ))) as Omit<ApiRouteContract, "id" | "method" | "path">;
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
  const initialPrimaryResponse = primaryResponse(route);
  const initialRequestJson = prettyJson(route.requestBody?.example);
  const initialResponseJson = prettyJson(initialPrimaryResponse?.example);
  const [routeMethod, setRouteMethod] = useState(route.method);
  const [routePath, setRoutePath] = useState(route.path);
  const [requestJson, setRequestJson] = useState(initialRequestJson);
  const [responseJson, setResponseJson] = useState(initialResponseJson);
  const [responseStatus, setResponseStatus] = useState(
    initialPrimaryResponse?.status ?? initialSuggestions.responseStatus,
  );
  const [issue, setIssue] = useState<"contract" | "duplicate" | "json" | null>(null);
  const [saveFailure, setSaveFailure] = useState<"route-conflict" | null>(null);
  const requestInputRef = useRef<HTMLTextAreaElement>(null);
  const responseInputRef = useRef<HTMLTextAreaElement>(null);
  const routeInputRef = useRef<HTMLInputElement>(null);
  const issueId = useId();
  const showRequest = bodyMethods.includes(routeMethod)
    || Boolean(route.requestBody || route.request);
  const statusOptions = useMemo(() => (
    [...new Set([responseStatus, ...commonResponseStatuses])].map((status) => ({
      id: status,
      kind: "action",
      label: status,
      onSelect: () => {
        setIssue(null);
        setResponseStatus(status);
        if (status === "204") setResponseJson("");
      },
    } satisfies SelectMenuOption))
  ), [responseStatus]);

  function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedRequest = parseJson(requestJson);
    const parsedResponse = parseJson(responseJson);
    if (!parsedRequest.valid || !parsedResponse.valid) {
      setIssue("json");
      queueMicrotask(() => (
        !parsedRequest.valid ? requestInputRef : responseInputRef
      ).current?.focus());
      return;
    }

    const suggestions = deriveApiRouteSuggestions(routeMethod, routePath);
    const previousContract = editableContract(route);
    const nextContract: Omit<ApiRouteContract, "id" | "method" | "path"> = {
      ...previousContract,
      operationId: previousContract.operationId ?? suggestions.operationId,
      parameters: synchronizePathParameters(
        previousContract.parameters ?? [],
        routePath,
      ),
      title: previousContract.title ?? suggestions.title,
    };

    const requestJsonChanged = requestJson !== initialRequestJson;
    if (parsedRequest.value !== undefined && requestJsonChanged) {
      const requestSchema = inferApiResponseSchemaFromJson(
        contractTypeName(routeMethod, routePath, "Request"),
        parsedRequest.value,
      );
      nextContract.request = requestSchema;
      nextContract.requestBody = {
        contentTypes: ["application/json"],
        example: parsedRequest.value,
        required: true,
        ...(requestSchema ? { schema: requestSchema } : {}),
      };
    } else if (requestJsonChanged && route.requestBody?.example !== undefined) {
      delete nextContract.request;
      delete nextContract.requestBody;
    }

    const responseJsonChanged = responseJson !== initialResponseJson;
    const responseSchema = parsedResponse.value === undefined || !responseJsonChanged
      ? undefined
      : inferApiResponseSchemaFromJson(
          contractTypeName(routeMethod, routePath, "Response"),
          parsedResponse.value,
        );
    const responses = [...(route.responses ?? [])];
    const primaryIndex = Math.max(0, responses.findIndex((response) => (
      response === initialPrimaryResponse
    )));
    const currentPrimary = responses[primaryIndex] ?? initialPrimaryResponse ?? {
      contentTypes: responseStatus === "204" ? [] : ["application/json"],
      description: content.routeContract.defaultResponseDescription,
      status: responseStatus,
    };
    let nextPrimary: ApiRouteResponse = {
      ...currentPrimary,
      contentTypes: responseStatus === "204"
        ? []
        : responseJsonChanged && parsedResponse.value !== undefined
          ? ["application/json"]
          : currentPrimary.contentTypes,
      status: responseStatus,
    };
    if (parsedResponse.value !== undefined && responseJsonChanged) {
      nextPrimary = withSchema({
        ...nextPrimary,
        example: parsedResponse.value,
      }, responseSchema);
    } else if (responseJsonChanged && initialPrimaryResponse?.example !== undefined) {
      const withoutExample = { ...nextPrimary };
      delete withoutExample.example;
      nextPrimary = withSchema(withoutExample, undefined);
    }
    if (responses.length === 0) responses.push(nextPrimary);
    else responses[primaryIndex] = nextPrimary;
    if (new Set(responses.map((response) => response.status)).size !== responses.length) {
      setIssue("duplicate");
      return;
    }
    nextContract.responses = responses;
    if (nextPrimary.schema) nextContract.response = nextPrimary.schema;
    else if (responseJsonChanged && initialPrimaryResponse?.example !== undefined) {
      delete nextContract.response;
      delete nextContract.paginated;
    }

    const result = onSave(nextContract, { method: routeMethod, path: routePath });
    if (result === "route-conflict") {
      setSaveFailure("route-conflict");
      queueMicrotask(() => routeInputRef.current?.focus());
    } else if (result === "schema-conflict" || result === "contract-invalid") {
      setIssue("contract");
    }
  }

  const errorMessage = issue === "json"
    ? content.routeContract.invalidExampleError
    : issue === "duplicate"
      ? content.routeContract.duplicateResponseStatusError
      : issue === "contract"
        ? content.routeContract.invalidContractError
        : null;

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
          setResponseStatus(deriveApiRouteSuggestions(nextMethod, routePath).responseStatus);
          setSaveFailure(null);
          setIssue(null);
          onRouteMethodChange?.(nextMethod);
        }}
        onPathChange={(nextPath) => {
          setRoutePath(nextPath);
          setSaveFailure(null);
          setIssue(null);
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
      <div className={styles.jsonEditors}>
        {showRequest ? (
          <section className={styles.jsonSection} aria-labelledby={`${issueId}-request`}>
            <div className={styles.sectionHeader}>
              <h3 id={`${issueId}-request`} className={styles.sectionTitle}>
                {content.requestBodyLabel}
              </h3>
              <p className={styles.sectionDescription}>
                {content.requestBodyDescription}
              </p>
            </div>
            <TextArea
              ref={requestInputRef}
              aria-describedby={issue === "json" ? issueId : undefined}
              aria-invalid={issue === "json" && !parseJson(requestJson).valid
                ? true
                : undefined}
              aria-label={content.routeContract.requestExampleLabel}
              name="request-json"
              placeholder={'{\n  "name": "Ada"\n}'}
              spellCheck={false}
              tone="nested"
              value={requestJson}
              onChange={(event) => {
                setIssue(null);
                setRequestJson(event.currentTarget.value);
              }}
            />
          </section>
        ) : null}
        <section className={styles.jsonSection} aria-labelledby={`${issueId}-response`}>
          <div className={styles.responseHeader}>
            <div className={styles.sectionHeader}>
              <h3 id={`${issueId}-response`} className={styles.sectionTitle}>
                {content.responseSectionLabel}
              </h3>
              <p className={styles.sectionDescription}>
                {content.responseSectionDescription}
              </p>
            </div>
            <SelectMenu
              height="large"
              label={content.routeContract.responseStatusLabel}
              options={statusOptions}
              rounded
              selectedId={responseStatus}
              width="content"
            />
          </div>
          {responseStatus !== "204" ? (
            <TextArea
              ref={responseInputRef}
              aria-describedby={issue === "json" ? issueId : undefined}
              aria-invalid={issue === "json" && !parseJson(responseJson).valid
                ? true
                : undefined}
              aria-label={content.routeContract.responseExampleLabel}
              name="response-json"
              placeholder={'{\n  "id": "user_123",\n  "name": "Ada"\n}'}
              spellCheck={false}
              tone="nested"
              value={responseJson}
              onChange={(event) => {
                setIssue(null);
                setResponseJson(event.currentTarget.value);
              }}
            />
          ) : null}
        </section>
      </div>
      {errorMessage ? (
        <p id={issueId} className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
