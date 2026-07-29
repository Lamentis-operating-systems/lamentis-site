import { describe, expect, it } from "vitest";
import {
  isValidApiResponseSchema,
  typeScriptIdentifierPattern,
} from "@/domain/site/api-response-schema";

describe("API response schemas", () => {
  it("accepts JSON-compatible TypeScript model fields", () => {
    expect(
      isValidApiResponseSchema({
        typeName: "UserResponse",
        fields: [
          {
            name: "displayName",
            optional: false,
            type: "string",
          },
          {
            arrayItemType: "object",
            name: "items",
            optional: true,
            type: "array",
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects invalid identifiers, duplicate fields, and incomplete arrays", () => {
    expect(typeScriptIdentifierPattern.test("User-Response")).toBe(false);
    expect(
      isValidApiResponseSchema({
        typeName: "UserResponse",
        fields: [
          { name: "id", optional: false, type: "string" },
          { name: "id", optional: true, type: "number" },
        ],
      }),
    ).toBe(false);
    expect(
      isValidApiResponseSchema({
        typeName: "UserResponse",
        fields: [
          { name: "items", optional: false, type: "array" },
        ],
      }),
    ).toBe(false);
  });
});
