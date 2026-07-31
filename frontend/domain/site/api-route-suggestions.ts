import {
  type ApiRouteParameter,
  type HttpMethod,
} from "./api-route";
import { parseApiRoutePath } from "./api-route-path";

export type ApiRouteSuggestions = {
  operationId: string;
  parameters: ApiRouteParameter[];
  requestTypeName: string;
  responseStatus: string;
  responseTypeName: string;
  title: string;
};

const methodVerb: Record<HttpMethod, string> = {
  GET: "get",
  POST: "create",
  PUT: "replace",
  PATCH: "update",
  DELETE: "delete",
  HEAD: "inspect",
  OPTIONS: "describe",
};

function words(value: string): string[] {
  return value.split(/[^A-Za-z0-9]+/).filter(Boolean);
}

function pascalCase(value: string): string {
  return words(value).map((word) => (
    `${word.charAt(0).toUpperCase()}${word.slice(1)}`
  )).join("");
}

function singular(value: string): string {
  if (value.endsWith("ies") && value.length > 3) return `${value.slice(0, -3)}y`;
  if (value.endsWith("sses")) return value.slice(0, -2);
  if (value.endsWith("s") && !value.endsWith("ss")) return value.slice(0, -1);
  return value;
}

function responseStatus(method: HttpMethod): string {
  if (method === "POST") return "201";
  if (method === "DELETE") return "204";
  return "200";
}

function parameterSuggestion(name: string): ApiRouteParameter {
  const normalizedName = name.toLowerCase();
  return {
    ...(normalizedName === "uuid" || normalizedName.endsWith("uuid")
      ? { format: "uuid" }
      : {}),
    location: "path",
    name,
    required: true,
    type: "string",
  };
}

export function deriveApiRouteSuggestions(
  method: HttpMethod,
  path: string,
): ApiRouteSuggestions {
  const segments = parseApiRoutePath(path)?.segments ?? [];
  const literals = segments.flatMap((segment) => (
    segment.kind === "literal" ? [segment.value] : []
  ));
  const parameterNames = segments.flatMap((segment) => (
    segment.kind === "parameter" ? [segment.name] : []
  ));
  const resourceLiteral = literals.at(-1) ?? "resource";
  const resourceName = pascalCase(singular(resourceLiteral)) || "Resource";
  const endsWithParameter = segments.at(-1)?.kind === "parameter";
  const isCollectionGet = method === "GET" && !endsWithParameter;
  const verb = isCollectionGet ? "list" : methodVerb[method];
  const operationSuffix = parameterNames.length > 0
    ? `By${parameterNames.map(pascalCase).join("And")}`
    : "";
  const requestPrefix: Partial<Record<HttpMethod, string>> = {
    POST: "Create",
    PUT: "Replace",
    PATCH: "Update",
  };

  return {
    operationId: `${verb}${resourceName}${operationSuffix}`,
    parameters: parameterNames.map(parameterSuggestion),
    requestTypeName: requestPrefix[method]
      ? `${requestPrefix[method]}${resourceName}Request`
      : "",
    responseStatus: responseStatus(method),
    responseTypeName: `${resourceName}Response`,
    title: `${pascalCase(verb)} ${
      isCollectionGet ? resourceLiteral : singular(resourceLiteral)
    }`,
  };
}

export function synchronizePathParameters(
  parameters: readonly ApiRouteParameter[],
  path: string,
): ApiRouteParameter[] {
  const suggestions = deriveApiRouteSuggestions("GET", path).parameters;
  const existingByName = new Map(
    parameters
      .filter((parameter) => parameter.location === "path")
      .map((parameter) => [parameter.name, parameter]),
  );
  return [
    ...suggestions.map((suggestion) => existingByName.get(suggestion.name) ?? suggestion),
    ...parameters.filter((parameter) => parameter.location !== "path"),
  ];
}
