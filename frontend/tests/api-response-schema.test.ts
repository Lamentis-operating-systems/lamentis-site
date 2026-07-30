import { describe, expect, it } from "vitest";
import {
  apiResponseSchemaSignature,
  areApiResponseSchemasEquivalent,
  canonicalizeApiResponseSchema,
  hasIncompatibleApiResponseSchema,
  isValidTypeScriptTypeName,
  isValidApiResponseSchema,
  type ApiResponseSchema,
  typeScriptIdentifierPattern,
} from "@/domain/site/api-response-schema";

describe("API response schemas", () => {
  it("rejects reserved TypeScript declaration names", () => {
    expect(isValidTypeScriptTypeName("UserResponse")).toBe(true);
    for (const reservedName of [
      "class",
      "default",
      "interface",
      "implements",
      "await",
      "string",
      "number",
      "boolean",
      "unknown",
      "any",
    ]) {
      expect(isValidTypeScriptTypeName(reservedName)).toBe(false);
    }
    expect(isValidTypeScriptTypeName("user-response")).toBe(false);
    expect(isValidApiResponseSchema({
      fields: [],
      typeName: "class",
    })).toBe(false);
  });

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

  it("compares schemas canonically without depending on field order", () => {
    const schema: ApiResponseSchema = {
      fields: [
        { name: "name", optional: false, type: "string" },
        { name: "id", optional: false, type: "number" },
      ],
      typeName: "UserResponse",
    };
    const reordered = {
      ...schema,
      fields: [...schema.fields].reverse(),
    };
    const incompatible = {
      ...schema,
      fields: [
        { name: "id", optional: false, type: "string" as const },
        schema.fields[0]!,
      ],
    };

    expect(canonicalizeApiResponseSchema(schema).fields.map(({ name }) => name))
      .toEqual(["id", "name"]);
    expect(apiResponseSchemaSignature(reordered))
      .toBe(apiResponseSchemaSignature(schema));
    expect(areApiResponseSchemasEquivalent(schema, reordered)).toBe(true);
    expect(hasIncompatibleApiResponseSchema([schema], reordered)).toBe(false);
    expect(hasIncompatibleApiResponseSchema([schema], incompatible)).toBe(true);
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
    expect(
      isValidApiResponseSchema({
        typeName: "UserResponse",
        fields: [
          {
            arrayItemType: "string",
            name: "id",
            optional: false,
            type: "string",
          },
        ],
      }),
    ).toBe(false);
  });
});
