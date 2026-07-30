import { describe, expect, it } from "vitest";
import {
  isValidApiRoutePath,
  parseApiRoutePath,
} from "@/domain/site/api-route-path";

describe("API route path syntax", () => {
  it("parses canonical literal and parameter segments once", () => {
    expect(parseApiRoutePath("/users/{uuid}/posts")).toEqual({
      path: "/users/{uuid}/posts",
      segments: [
        { kind: "literal", value: "users" },
        { kind: "parameter", name: "uuid" },
        { kind: "literal", value: "posts" },
      ],
    });
    expect(parseApiRoutePath("/")).toBeNull();
    expect(parseApiRoutePath("/users/")).toBeNull();
  });

  it.each([
    "/users",
    "/users/{uuid}",
    "/users/{userid}/posts",
    "/v1/userprofiles/{uuid}",
  ])("accepts %s", (path) => {
    expect(isValidApiRoutePath(path)).toBe(true);
  });

  it.each([
    "",
    "/",
    "users/{uuid}",
    "/users/",
    "/users//posts",
    "/users/{uuid",
    "/users/uuid}",
    "/users/{123}",
    "/Users",
    "/users/{user_id}",
    "/users/{user-id}",
    "/user-profiles",
    "/users/profile.json",
    "/users/{uuid}?active=true",
    "/users/../admin",
    "/users with spaces",
  ])("rejects %s", (path) => {
    expect(isValidApiRoutePath(path)).toBe(false);
  });
});
