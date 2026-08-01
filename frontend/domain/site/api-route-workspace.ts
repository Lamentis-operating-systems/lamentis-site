import type { ApiResponseSchema } from "./api-response-schema";
import { hasIncompatibleApiResponseSchema } from "./api-response-schema";
import {
  apiRouteSchemas,
  hasApiSchemaConflict,
  hasApiRouteIdentity,
  httpMethods,
  isApiRouteContractList,
  type ApiRouteContract,
  type HttpMethod,
} from "./api-route";
import { isValidApiRoutePath } from "./api-route-path";

export type ApiRouteWorkspaceSaveResult =
  | "saved"
  | "route-missing"
  | "route-conflict"
  | "contract-invalid"
  | "schema-conflict";

export type ApiRouteWorkspaceSaveTransition = {
  result: ApiRouteWorkspaceSaveResult;
  routes: ApiRouteContract[];
};

type ApiRouteWorkspaceSaveRequest = {
  behavior?: ApiRouteContract["behavior"];
  deprecated?: ApiRouteContract["deprecated"];
  description?: ApiRouteContract["description"];
  operationId?: ApiRouteContract["operationId"];
  paginated?: boolean;
  parameters?: ApiRouteContract["parameters"];
  request?: ApiResponseSchema;
  requestBody?: ApiRouteContract["requestBody"];
  response?: ApiResponseSchema;
  responses?: ApiRouteContract["responses"];
  route: Pick<ApiRouteContract, "method" | "path">;
  routeId: number;
  security?: ApiRouteContract["security"];
  tags?: ApiRouteContract["tags"];
  title?: ApiRouteContract["title"];
};

export type ApiRouteWorkspaceValidationReason =
  | "duplicate"
  | "syntax";

export function transitionApiRouteWorkspaceSave(
  routes: ApiRouteContract[],
  request: ApiRouteWorkspaceSaveRequest,
): ApiRouteWorkspaceSaveTransition {
  const { route, routeId, ...contract } = request;
  if (!routes.some((candidateRoute) => candidateRoute.id === routeId)) {
    return { result: "route-missing", routes };
  }

  if (hasApiRouteIdentity(routes, route, routeId)) {
    return { result: "route-conflict", routes };
  }

  const compactContract = Object.fromEntries(
    Object.entries(contract).filter(([, value]) => value !== undefined),
  ) as Omit<ApiRouteContract, "id" | "method" | "path">;
  const candidateRoute: ApiRouteContract = {
    id: routeId,
    ...route,
    ...compactContract,
  };
  const candidateRoutes = routes.map((currentRoute) => (
    currentRoute.id === routeId ? candidateRoute : currentRoute
  ));
  if (!isApiRouteContractList(candidateRoutes)) {
    return { result: "contract-invalid", routes };
  }
  const candidateSchemas = apiRouteSchemas(candidateRoute);
  if (candidateSchemas.some((schema, index) => (
    hasApiSchemaConflict(routes, schema, routeId)
    || hasIncompatibleApiResponseSchema(
      candidateSchemas.filter((_, candidateIndex) => candidateIndex !== index),
      schema,
    )
  ))) {
    return { result: "schema-conflict", routes };
  }

  return {
    result: "saved",
    routes: candidateRoutes,
  };
}

export function disabledApiRouteMethods(
  routes: readonly ApiRouteContract[],
  route: Pick<ApiRouteContract, "id" | "method" | "path">,
): HttpMethod[] {
  return httpMethods.filter((candidateMethod) => (
    candidateMethod !== route.method
    && hasApiRouteIdentity(
      routes,
      { method: candidateMethod, path: route.path },
      route.id,
    )
  ));
}

export function apiRouteWorkspaceValidationReason(
  routes: readonly ApiRouteContract[],
  route: Pick<ApiRouteContract, "method" | "path">,
  excludingRouteId?: number,
): ApiRouteWorkspaceValidationReason | null {
  if (!isValidApiRoutePath(route.path)) return "syntax";

  return hasApiRouteIdentity(routes, route, excludingRouteId)
    ? "duplicate"
    : null;
}
