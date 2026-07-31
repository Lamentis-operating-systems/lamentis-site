import {
  hasIncompatibleApiResponseSchema,
  isValidPersistedApiResponseSchema,
  type ApiResponseSchema,
} from "./api-response-schema";
import { isValidApiRoutePath } from "./api-route-path";

export const httpMethods = ["GET", "POST", "PATCH", "DELETE"] as const;

export type HttpMethod = (typeof httpMethods)[number];

export type ApiRouteIdentity = `${HttpMethod} ${string}`;

export type ApiRouteContract = {
  id: number;
  method: HttpMethod;
  path: string;
  paginated?: boolean;
  request?: ApiResponseSchema;
  response?: ApiResponseSchema;
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
        ? [route.request, route.response].filter(
            (schema): schema is ApiResponseSchema => Boolean(schema),
          )
        : []
    )),
    candidate,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
    && (
      value.request === undefined
      || isValidPersistedApiResponseSchema(value.request)
    )
    && (
      value.response === undefined
      || isValidPersistedApiResponseSchema(value.response)
    )
    && (!value.paginated || value.response !== undefined)
  );
}

export function isApiRouteContractList(
  value: unknown,
): value is ApiRouteContract[] {
  if (!Array.isArray(value)) return false;

  const routeIds = new Set<number>();

  for (const route of value) {
    if (!isApiRouteContract(route) || routeIds.has(route.id)) return false;
    routeIds.add(route.id);
  }

  return true;
}

export function nextApiRouteId(routes: readonly ApiRouteContract[]): number {
  const routeIds = new Set(routes.map((route) => route.id));
  let candidate = 0;

  while (routeIds.has(candidate)) candidate += 1;

  return candidate;
}
