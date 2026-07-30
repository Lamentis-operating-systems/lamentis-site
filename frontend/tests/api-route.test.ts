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
