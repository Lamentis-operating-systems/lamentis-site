import type { ApiResponseSchema } from "./api-response-schema";
import {
  hasApiResponseSchemaConflict,
  hasApiRouteIdentity,
  httpMethods,
  type ApiRouteContract,
  type HttpMethod,
} from "./api-route";
import { isValidApiRoutePath } from "./api-route-path";

export type ApiRouteWorkspaceSaveResult =
  | "saved"
  | "route-missing"
  | "route-conflict"
  | "schema-conflict";

export type ApiRouteWorkspaceSaveTransition = {
  result: ApiRouteWorkspaceSaveResult;
  routes: ApiRouteContract[];
};

type ApiRouteWorkspaceSaveRequest = {
  response: ApiResponseSchema;
  route: Pick<ApiRouteContract, "method" | "path">;
  routeId: number;
};

export type ApiRouteWorkspaceValidationReason =
  | "duplicate"
  | "syntax";

export function transitionApiRouteWorkspaceSave(
  routes: ApiRouteContract[],
  {
    response,
    route,
    routeId,
  }: ApiRouteWorkspaceSaveRequest,
): ApiRouteWorkspaceSaveTransition {
  if (!routes.some((candidateRoute) => candidateRoute.id === routeId)) {
    return { result: "route-missing", routes };
  }

  if (hasApiRouteIdentity(routes, route, routeId)) {
    return { result: "route-conflict", routes };
  }

  if (hasApiResponseSchemaConflict(routes, response, routeId)) {
    return { result: "schema-conflict", routes };
  }

  return {
    result: "saved",
    routes: routes.map((candidateRoute) => (
      candidateRoute.id === routeId
        ? {
            ...candidateRoute,
            ...route,
            response,
          }
        : candidateRoute
    )),
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
