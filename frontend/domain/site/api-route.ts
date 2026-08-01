import {
  hasIncompatibleApiResponseSchema,
  isValidPersistedApiResponseSchema,
  type ApiResponseSchema,
} from "./api-response-schema";
import { isValidApiRoutePath } from "./api-route-path";
import { parseApiRoutePath } from "./api-route-path";

export const httpMethods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type HttpMethod = (typeof httpMethods)[number];

export const apiParameterLocations = [
  "path",
  "query",
  "header",
  "cookie",
] as const;
export const apiParameterTypes = [
  "string",
  "number",
  "integer",
  "boolean",
  "array",
] as const;
export const apiQueryArraySerializations = [
  "repeat",
  "comma",
  "space",
  "pipe",
] as const;
export const apiSecuritySchemes = [
  "none",
  "bearer",
  "basic",
  "apiKey",
  "cookie",
  "oauth2",
] as const;
export const apiCachePolicies = [
  "unspecified",
  "no-store",
  "private",
  "public",
] as const;
export const apiIdempotencyPolicies = [
  "unspecified",
  "idempotent",
  "non-idempotent",
  "idempotency-key",
] as const;

export type ApiParameterLocation = (typeof apiParameterLocations)[number];
export type ApiParameterType = (typeof apiParameterTypes)[number];
export type ApiQueryArraySerialization =
  (typeof apiQueryArraySerializations)[number];
export type ApiSecurityScheme = (typeof apiSecuritySchemes)[number];
export type ApiCachePolicy = (typeof apiCachePolicies)[number];
export type ApiIdempotencyPolicy = (typeof apiIdempotencyPolicies)[number];

export type ApiRouteParameter = {
  defaultValue?: string;
  description?: string;
  enumValues?: string[];
  example?: string;
  format?: string;
  location: ApiParameterLocation;
  maximum?: number;
  maxLength?: number;
  minimum?: number;
  minLength?: number;
  name: string;
  pattern?: string;
  required: boolean;
  serialization?: ApiQueryArraySerialization;
  type: ApiParameterType;
};

export type ApiRouteHeader = {
  description?: string;
  name: string;
  type: ApiParameterType;
};

type ApiRouteRequestBody = {
  contentTypes: string[];
  example?: ApiContractExample;
  required: boolean;
  schema?: ApiResponseSchema;
};

export type ApiRouteResponse = {
  contentTypes: string[];
  description: string;
  example?: ApiContractExample;
  headers?: ApiRouteHeader[];
  paginated?: boolean;
  schema?: ApiResponseSchema;
  status: string;
};

export type ApiContractExample =
  | boolean
  | null
  | number
  | string
  | ApiContractExample[]
  | { [key: string]: ApiContractExample };

export type ApiRouteSecurity = {
  location?: Exclude<ApiParameterLocation, "path">;
  name?: string;
  scheme: ApiSecurityScheme;
  scopes?: string[];
};

type ApiRouteBehavior = {
  cache?: ApiCachePolicy;
  idempotency?: ApiIdempotencyPolicy;
  rateLimit?: string;
};

export type ApiRouteIdentity = `${HttpMethod} ${string}`;

export type ApiRouteContract = {
  behavior?: ApiRouteBehavior;
  deprecated?: boolean;
  description?: string;
  id: number;
  method: HttpMethod;
  operationId?: string;
  parameters?: ApiRouteParameter[];
  path: string;
  paginated?: boolean;
  request?: ApiResponseSchema;
  requestBody?: ApiRouteRequestBody;
  response?: ApiResponseSchema;
  responses?: ApiRouteResponse[];
  security?: ApiRouteSecurity;
  tags?: string[];
  title?: string;
};

type ApiRouteIdentitySource = Pick<ApiRouteContract, "method" | "path">;

export function apiRouteIdentity(
  route: ApiRouteIdentitySource,
): ApiRouteIdentity {
  return `${route.method} ${route.path}`;
}

export function hasApiRouteIdentity(
  routes: readonly ApiRouteContract[],
  candidate: ApiRouteIdentitySource,
  excludingId?: number,
): boolean {
  const candidateIdentity = apiRouteIdentity(candidate);

  return routes.some((route) => (
    route.id !== excludingId
    && apiRouteIdentity(route) === candidateIdentity
  ));
}

export function hasApiResponseSchemaConflict(
  routes: readonly ApiRouteContract[],
  candidate: ApiResponseSchema,
  excludingId?: number,
): boolean {
  return hasIncompatibleApiResponseSchema(
    routes.flatMap((route) => (
      route.id !== excludingId && route.response ? [route.response] : []
    )),
    candidate,
  );
}

export function hasApiSchemaConflict(
  routes: readonly ApiRouteContract[],
  candidate: ApiResponseSchema,
  excludingId?: number,
): boolean {
  return hasIncompatibleApiResponseSchema(
    routes.flatMap((route) => (
      route.id !== excludingId
        ? apiRouteSchemas(route)
        : []
    )),
    candidate,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const parameterNamePattern = /^[A-Za-z][A-Za-z0-9_-]*$/;
const operationIdPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const mediaTypePattern = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
const responseStatusPattern = /^(?:default|[1-5][0-9]{2})$/;

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function isMediaTypeList(value: unknown): value is string[] {
  return isStringList(value) && value.every((item) => mediaTypePattern.test(item));
}

function isApiParameterType(value: unknown): value is ApiParameterType {
  return apiParameterTypes.some((type) => type === value);
}

function isApiRouteParameter(value: unknown): value is ApiRouteParameter {
  const valid = isRecord(value)
    && apiParameterLocations.some((location) => location === value.location)
    && typeof value.name === "string"
    && parameterNamePattern.test(value.name)
    && typeof value.required === "boolean"
    && isApiParameterType(value.type)
    && isOptionalString(value.format)
    && isOptionalString(value.description)
    && isOptionalString(value.defaultValue)
    && isOptionalString(value.example)
    && isOptionalString(value.pattern)
    && (value.enumValues === undefined || isStringList(value.enumValues))
    && (value.minimum === undefined || typeof value.minimum === "number")
    && (value.maximum === undefined || typeof value.maximum === "number")
    && (value.minLength === undefined || Number.isSafeInteger(value.minLength))
    && (value.maxLength === undefined || Number.isSafeInteger(value.maxLength))
    && (value.serialization === undefined
      || apiQueryArraySerializations.some((item) => item === value.serialization))
    && (value.location !== "path" || value.required === true);
  if (!valid) return false;
  const parameter = value as ApiRouteParameter;
  if (parameter.minimum !== undefined && parameter.maximum !== undefined
    && parameter.minimum > parameter.maximum) return false;
  if (parameter.minLength !== undefined && parameter.minLength < 0) return false;
  if (parameter.maxLength !== undefined && parameter.maxLength < 0) return false;
  if (parameter.minLength !== undefined && parameter.maxLength !== undefined
    && parameter.minLength > parameter.maxLength) return false;
  if ((parameter.minimum !== undefined || parameter.maximum !== undefined)
    && parameter.type !== "number" && parameter.type !== "integer") return false;
  if ((parameter.minLength !== undefined || parameter.maxLength !== undefined
    || parameter.pattern !== undefined) && parameter.type !== "string") return false;
  return parameter.serialization === undefined
    || (parameter.location === "query" && parameter.type === "array");
}

function isApiContractExample(
  value: unknown,
  ancestors = new Set<unknown>(),
): value is ApiContractExample {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Array.isArray(value)
    ? value.every((item) => isApiContractExample(item, ancestors))
    : Object.entries(value).every(([, item]) => (
        isApiContractExample(item, ancestors)
      ));
  ancestors.delete(value);
  return valid;
}

function isApiRouteHeader(value: unknown): value is ApiRouteHeader {
  return isRecord(value)
    && typeof value.name === "string"
    && parameterNamePattern.test(value.name)
    && isApiParameterType(value.type)
    && isOptionalString(value.description);
}

function isApiRouteRequestBody(value: unknown): value is ApiRouteRequestBody {
  return isRecord(value)
    && isMediaTypeList(value.contentTypes)
    && value.contentTypes.length > 0
    && typeof value.required === "boolean"
    && (value.example === undefined || isApiContractExample(value.example))
    && (
      value.schema === undefined
      || isValidPersistedApiResponseSchema(value.schema)
    );
}

function isApiRouteResponse(value: unknown): value is ApiRouteResponse {
  return isRecord(value)
    && typeof value.status === "string"
    && responseStatusPattern.test(value.status)
    && typeof value.description === "string"
    && value.description.trim().length > 0
    && isMediaTypeList(value.contentTypes)
    && (value.example === undefined || isApiContractExample(value.example))
    && (value.schema === undefined || value.contentTypes.length > 0)
    && (value.status !== "204" || (
      value.contentTypes.length === 0
      && value.schema === undefined
      && value.example === undefined
    ))
    && (value.paginated === undefined || typeof value.paginated === "boolean")
    && (
      value.schema === undefined
      || isValidPersistedApiResponseSchema(value.schema)
    )
    && (!value.paginated || value.schema !== undefined)
    && (
      value.headers === undefined
      || (
        Array.isArray(value.headers)
        && value.headers.every(isApiRouteHeader)
        && new Set(value.headers.map((header) => header.name.toLowerCase())).size
          === value.headers.length
      )
    );
}

function isApiRouteSecurity(value: unknown): value is ApiRouteSecurity {
  if (
    !isRecord(value)
    || !apiSecuritySchemes.some((scheme) => scheme === value.scheme)
    || !isOptionalString(value.name)
    || (
      value.location !== undefined
      && !["query", "header", "cookie"].includes(String(value.location))
    )
    || (value.scopes !== undefined && !isStringList(value.scopes))
  ) {
    return false;
  }
  if (value.scheme === "none") {
    return value.name === undefined
      && value.location === undefined
      && value.scopes === undefined;
  }
  if (value.scheme === "apiKey") {
    return typeof value.name === "string" && value.location !== undefined;
  }
  if (value.scheme === "cookie") {
    return typeof value.name === "string" && value.location === "cookie";
  }
  return value.name === undefined && value.location === undefined;
}

function isApiRouteBehavior(value: unknown): value is ApiRouteBehavior {
  return isRecord(value)
    && (
      value.cache === undefined
      || apiCachePolicies.some((policy) => policy === value.cache)
    )
    && (
      value.idempotency === undefined
      || apiIdempotencyPolicies.some((policy) => policy === value.idempotency)
    )
    && isOptionalString(value.rateLimit);
}

function parametersMatchPath(
  path: string,
  parameters: readonly ApiRouteParameter[],
): boolean {
  const pathNames = (parseApiRoutePath(path)?.segments ?? []).flatMap((segment) => (
    segment.kind === "parameter" ? [segment.name] : []
  ));
  const parameterIdentities = parameters.map((parameter) => (
    `${parameter.location}:${parameter.name.toLowerCase()}`
  ));
  if (new Set(parameterIdentities).size !== parameterIdentities.length) return false;

  const declaredPathNames = parameters
    .filter((parameter) => parameter.location === "path")
    .map((parameter) => parameter.name);
  return declaredPathNames.length === pathNames.length
    && pathNames.every((name) => declaredPathNames.includes(name));
}

function isHttpMethod(value: unknown): value is HttpMethod {
  return (
    typeof value === "string"
    && httpMethods.some((method) => method === value)
  );
}

function isApiRouteContract(
  value: unknown,
): value is ApiRouteContract {
  if (
    !isRecord(value)
    || !Number.isSafeInteger(value.id)
    || Number(value.id) < 0
    || !isHttpMethod(value.method)
    || typeof value.path !== "string"
    || !isValidApiRoutePath(value.path)
  ) {
    return false;
  }

  return (
    (value.paginated === undefined || typeof value.paginated === "boolean")
    && (value.title === undefined || isOptionalString(value.title))
    && (value.description === undefined || isOptionalString(value.description))
    && (
      value.operationId === undefined
      || (
        typeof value.operationId === "string"
        && operationIdPattern.test(value.operationId)
      )
    )
    && (value.deprecated === undefined || typeof value.deprecated === "boolean")
    && (value.tags === undefined || isStringList(value.tags))
    && (
      value.parameters === undefined
      || (
        Array.isArray(value.parameters)
        && value.parameters.every(isApiRouteParameter)
        && parametersMatchPath(value.path, value.parameters)
      )
    )
    && (
      value.request === undefined
      || isValidPersistedApiResponseSchema(value.request)
    )
    && (
      value.response === undefined
      || isValidPersistedApiResponseSchema(value.response)
    )
    && (!value.paginated || value.response !== undefined)
    && (
      value.requestBody === undefined
      || isApiRouteRequestBody(value.requestBody)
    )
    && (
      value.responses === undefined
      || (
        Array.isArray(value.responses)
        && value.responses.length > 0
        && value.responses.every(isApiRouteResponse)
        && new Set(value.responses.map((response) => response.status)).size
          === value.responses.length
      )
    )
    && (value.security === undefined || isApiRouteSecurity(value.security))
    && (value.behavior === undefined || isApiRouteBehavior(value.behavior))
  );
}

export function apiRouteRequestSchema(
  route: ApiRouteContract,
): ApiResponseSchema | undefined {
  return route.requestBody?.schema ?? route.request;
}

export function apiRouteResponses(
  route: ApiRouteContract,
): ApiRouteResponse[] {
  if (route.responses) return route.responses;
  if (!route.response) return [];
  return [{
    contentTypes: ["application/json"],
    description: "Successful response",
    ...(route.paginated ? { paginated: true } : {}),
    schema: route.response,
    status: "200",
  }];
}

export function apiRouteSchemas(route: ApiRouteContract): ApiResponseSchema[] {
  return [
    apiRouteRequestSchema(route),
    ...apiRouteResponses(route).map((response) => response.schema),
  ].filter((schema): schema is ApiResponseSchema => Boolean(schema));
}

export function isApiRouteContractList(
  value: unknown,
): value is ApiRouteContract[] {
  if (!Array.isArray(value)) return false;

  const routeIds = new Set<number>();
  const operationIds = new Set<string>();

  for (const route of value) {
    if (!isApiRouteContract(route) || routeIds.has(route.id)) return false;
    routeIds.add(route.id);
    if (route.operationId) {
      if (operationIds.has(route.operationId)) return false;
      operationIds.add(route.operationId);
    }
  }

  return true;
}

export function nextApiRouteId(routes: readonly ApiRouteContract[]): number {
  const routeIds = new Set(routes.map((route) => route.id));
  let candidate = 0;

  while (routeIds.has(candidate)) candidate += 1;

  return candidate;
}
