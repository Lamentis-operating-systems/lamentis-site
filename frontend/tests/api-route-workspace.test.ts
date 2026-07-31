import { describe, expect, it } from "vitest";
import type { ApiResponseSchema } from "@/domain/site/api-response-schema";
import { generateApiContractsAgentSkill } from "@/domain/site/api-contract-skill";
import {
  isApiRouteContractList,
  type ApiRouteContract,
} from "@/domain/site/api-route";
import {
  apiRouteWorkspaceValidationReason,
  disabledApiRouteMethods,
  transitionApiRouteWorkspaceSave,
} from "@/domain/site/api-route-workspace";

const userResponse: ApiResponseSchema = {
  fields: [
    { name: "id", optional: false, type: "string" },
  ],
  typeName: "UserResponse",
};

const routes: ApiRouteContract[] = [
  {
    id: 1,
    method: "GET",
    path: "/users",
    response: userResponse,
  },
  {
    id: 2,
    method: "POST",
    path: "/accounts",
  },
];

describe("API-route workspace", () => {
  it("saves a route and response as one pure transition", () => {
    const accountResponse: ApiResponseSchema = {
      fields: [
        { name: "name", optional: false, type: "string" },
      ],
      typeName: "AccountResponse",
    };

    const transition = transitionApiRouteWorkspaceSave(routes, {
      response: accountResponse,
      route: { method: "PATCH", path: "/accounts/{id}" },
      routeId: 2,
    });

    expect(transition).toEqual({
      result: "saved",
      routes: [
        routes[0],
        {
          id: 2,
          method: "PATCH",
          path: "/accounts/{id}",
          response: accountResponse,
        },
      ],
    });
    expect(transition.routes).not.toBe(routes);
    expect(transition.routes[0]).toBe(routes[0]);
    expect(routes[1]).toEqual({
      id: 2,
      method: "POST",
      path: "/accounts",
    });
  });

  it("saves an optional request schema and pagination with the response", () => {
    const request: ApiResponseSchema = {
      fields: [{ name: "search", optional: false, type: "string" }],
      typeName: "AccountRequest",
    };
    const transition = transitionApiRouteWorkspaceSave(routes, {
      paginated: true,
      request,
      response: userResponse,
      route: { method: "POST", path: "/accounts" },
      routeId: 2,
    });

    expect(transition.result).toBe("saved");
    expect(transition.routes[1]).toMatchObject({
      paginated: true,
      request,
      response: userResponse,
    });
  });

  it("reports a missing route without replacing the workspace", () => {
    const transition = transitionApiRouteWorkspaceSave(routes, {
      response: userResponse,
      route: { method: "GET", path: "/missing" },
      routeId: 99,
    });

    expect(transition).toEqual({
      result: "route-missing",
      routes,
    });
    expect(transition.routes).toBe(routes);
  });

  it("reports a canonical route conflict without replacing the workspace", () => {
    const transition = transitionApiRouteWorkspaceSave(routes, {
      response: userResponse,
      route: { method: "GET", path: "/users" },
      routeId: 2,
    });

    expect(transition).toEqual({
      result: "route-conflict",
      routes,
    });
    expect(transition.routes).toBe(routes);
  });

  it("reports an incompatible response schema without replacing the workspace", () => {
    const transition = transitionApiRouteWorkspaceSave(routes, {
      response: {
        fields: [
          { name: "id", optional: false, type: "number" },
        ],
        typeName: "UserResponse",
      },
      route: { method: "POST", path: "/accounts" },
      routeId: 2,
    });

    expect(transition).toEqual({
      result: "schema-conflict",
      routes,
    });
    expect(transition.routes).toBe(routes);
  });

  it("derives disabled methods for the current route and path", () => {
    expect(disabledApiRouteMethods(
      [
        ...routes,
        { id: 3, method: "DELETE", path: "/accounts" },
        { id: 4, method: "PATCH", path: "/other" },
        { id: 5, method: "GET", path: "/accounts" },
      ],
      routes[1]!,
    )).toEqual(["GET", "DELETE"]);
  });

  it("validates syntax and duplicate identity while excluding an edited route", () => {
    expect(apiRouteWorkspaceValidationReason(
      routes,
      { method: "GET", path: "users" },
    )).toBe("syntax");
    expect(apiRouteWorkspaceValidationReason(
      routes,
      { method: "GET", path: "/users" },
    )).toBe("duplicate");
    expect(apiRouteWorkspaceValidationReason(
      routes,
      { method: "GET", path: "/users" },
      1,
    )).toBeNull();
    expect(apiRouteWorkspaceValidationReason(
      routes,
      { method: "DELETE", path: "/users" },
    )).toBeNull();
  });

  it("keeps legacy conflicts readable while blocking their export", () => {
    const conflictingRoutes: ApiRouteContract[] = [
      routes[0]!,
      {
        id: 3,
        method: "GET",
        path: "/users",
        response: {
          fields: [
            { name: "id", optional: false, type: "number" },
          ],
          typeName: "UserResponse",
        },
      },
    ];

    expect(isApiRouteContractList(conflictingRoutes)).toBe(true);

    const skill = generateApiContractsAgentSkill(conflictingRoutes);
    expect(skill).toContain(
      "**BLOCKED: conflicting response definitions**",
    );
    expect(skill).toContain("### `UserResponse` — BLOCKED");
  });
});
