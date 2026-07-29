import { describe, expect, it } from "vitest";
import {
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
});
