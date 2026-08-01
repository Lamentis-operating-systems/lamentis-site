import { describe, expect, it } from "vitest";
import {
  apiRouteIdentity,
  hasApiResponseSchemaConflict,
  hasApiRouteIdentity,
  isApiRouteContractList,
  nextApiRouteId,
  type ApiRouteContract,
} from "@/domain/site/api-route";
import { apiRoutesStorage } from "@/domain/site/api-route-storage";

const validRoute: ApiRouteContract = {
  id: 3,
  method: "GET",
  path: "/users/{uuid}",
  response: {
    fields: [
      {
        name: "items",
        optional: false,
        type: "array",
        arrayItemType: "string",
      },
    ],
    typeName: "UserResponse",
  },
};

describe("API-route persistence schema", () => {
  it("accepts minimal valid routes and a valid response schema", () => {
    expect(isApiRouteContractList([validRoute])).toBe(true);
    expect(isApiRouteContractList([{
      ...validRoute,
      response: {
        fields: [
          { name: "profile", optional: false, type: "object" },
        ],
        typeName: "LegacyResponse",
      },
    }])).toBe(true);
    expect(apiRoutesStorage.key).toBe("lamentis:api-creator-routes:v1");
    expect(isApiRouteContractList([{
      ...validRoute,
      paginated: true,
      request: {
        fields: [{ name: "query", optional: false, type: "string" }],
        typeName: "UserRequest",
      },
    }])).toBe(true);
    expect(isApiRouteContractList([{
      id: 4,
      method: "GET",
      paginated: true,
      path: "/invalid-page",
    }])).toBe(false);
  });

  it("accepts a fully documented route and rejects unsynchronized path parameters", () => {
    const richRoute: ApiRouteContract = {
      behavior: {
        cache: "private",
        idempotency: "idempotent",
        rateLimit: "120/minute",
      },
      description: "Fetch one user.",
      id: 8,
      method: "GET",
      operationId: "getUserByUuid",
      parameters: [
        {
          format: "uuid",
          location: "path",
          name: "uuid",
          required: true,
          type: "string",
        },
        {
          defaultValue: "10",
          enumValues: ["10", "25", "50"],
          example: "25",
          location: "query",
          name: "include",
          required: false,
          serialization: "repeat",
          type: "array",
        },
      ],
      path: "/users/{uuid}",
      responses: [{
        contentTypes: ["application/json"],
        description: "The user.",
        example: { items: ["active"] },
        headers: [{ name: "ETag", type: "string" }],
        schema: validRoute.response,
        status: "200",
      }],
      security: { scheme: "bearer" },
      tags: ["users"],
      title: "Get user",
    };

    expect(isApiRouteContractList([richRoute])).toBe(true);
    expect(isApiRouteContractList([{
      ...richRoute,
      parameters: richRoute.parameters?.filter(({ location }) => location !== "path"),
    }])).toBe(false);
    expect(isApiRouteContractList([{
      ...richRoute,
      parameters: richRoute.parameters?.map((parameter) => (
        parameter.name === "include"
          ? { ...parameter, location: "header" as const }
          : parameter
      )),
    }])).toBe(false);
    expect(isApiRouteContractList([{
      ...richRoute,
      responses: [richRoute.responses![0]!, richRoute.responses![0]!],
    }])).toBe(false);
    expect(isApiRouteContractList([
      richRoute,
      { ...richRoute, id: 9, operationId: richRoute.operationId, path: "/profiles" },
    ])).toBe(false);
  });

  it.each([
    { value: [{ ...validRoute, id: -1 }] },
    { value: [{ ...validRoute, method: "TRACE" }] },
    { value: [{ ...validRoute, path: "users" }] },
    {
      value: [
        { ...validRoute, response: { fields: [], typeName: "not valid" } },
      ],
    },
    { value: [validRoute, { ...validRoute }] },
  ])("rejects invalid or duplicate persisted route data", ({ value }) => {
    expect(isApiRouteContractList(value)).toBe(false);
  });

  it("selects the first unused non-negative route id", () => {
    expect(nextApiRouteId([
      { id: 2, method: "GET", path: "/two" },
      { id: 0, method: "POST", path: "/zero" },
    ])).toBe(1);
  });

  it("derives and checks the canonical method-plus-path identity", () => {
    expect(apiRouteIdentity(validRoute)).toBe("GET /users/{uuid}");
    expect(hasApiRouteIdentity(
      [validRoute],
      { method: "GET", path: "/users/{uuid}" },
    )).toBe(true);
    expect(hasApiRouteIdentity(
      [validRoute],
      { method: "POST", path: "/users/{uuid}" },
    )).toBe(false);
    expect(hasApiRouteIdentity(
      [validRoute],
      { method: "GET", path: "/users/{uuid}" },
      validRoute.id,
    )).toBe(false);
  });

  it("detects incompatible response schemas with the same type name", () => {
    expect(hasApiResponseSchemaConflict(
      [validRoute],
      {
        ...validRoute.response!,
        fields: [...validRoute.response!.fields].reverse(),
      },
    )).toBe(false);
    expect(hasApiResponseSchemaConflict(
      [validRoute],
      {
        fields: [
          { name: "items", optional: false, type: "number" },
        ],
        typeName: "UserResponse",
      },
    )).toBe(true);
    expect(hasApiResponseSchemaConflict(
      [validRoute],
      {
        fields: [
          { name: "items", optional: false, type: "number" },
        ],
        typeName: "OtherResponse",
      },
    )).toBe(false);
    expect(hasApiResponseSchemaConflict(
      [validRoute],
      {
        fields: [],
        typeName: "UserResponse",
      },
      validRoute.id,
    )).toBe(false);
  });
});
