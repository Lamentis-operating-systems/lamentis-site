import { describe, expect, it } from "vitest";
import {
  apiPaginatedResponseItemJsonSchema,
  apiPaginatedResponseSchema,
  apiResponseSchemaFromJsonSchema,
  apiResponseSchemaSignature,
  apiResponseSchemaToJsonSchema,
  areApiResponseSchemasEquivalent,
  canonicalizeApiResponseSchema,
  hasIncompatibleApiResponseSchema,
  isValidPersistedApiResponseSchema,
  isValidTypeScriptTypeName,
  isValidApiResponseSchema,
  type ApiResponseSchema,
  typeScriptIdentifierPattern,
} from "@/domain/site/api-response-schema";

describe("API response schemas", () => {
  it("builds the deterministic paginated response envelope", () => {
    const response: ApiResponseSchema = {
      fields: [{ name: "id", optional: false, type: "string" }],
      typeName: "UserResponse",
    };

    expect(apiPaginatedResponseSchema(response)).toEqual({
      fields: [
        {
          arrayItemType: "object",
          name: "items",
          objectSchema: response,
          optional: false,
          type: "array",
        },
        { name: "totalHits", optional: false, type: "number" },
        { name: "page", optional: false, type: "number" },
        { name: "limit", optional: false, type: "number" },
        { name: "totalPages", optional: false, type: "number" },
      ],
      typeName: "UserResponsePage",
    });
  });

  it("extracts only the exact paginated JSON Schema envelope", () => {
    const response: ApiResponseSchema = {
      fields: [{ name: "id", optional: false, type: "string" }],
      typeName: "UserResponse",
    };
    const itemSchema = apiResponseSchemaToJsonSchema(response);
    const envelope = apiResponseSchemaToJsonSchema(
      apiPaginatedResponseSchema(response),
    );
    const properties = envelope.properties as Record<string, unknown>;

    expect(apiPaginatedResponseItemJsonSchema(envelope)).toEqual(itemSchema);
    expect(apiPaginatedResponseItemJsonSchema({
      ...envelope,
      properties: {
        ...properties,
        totalHits: { type: "string" },
      },
    })).toBeUndefined();
    expect(apiPaginatedResponseItemJsonSchema({
      ...envelope,
      properties: {
        ...properties,
        cursor: { type: "string" },
      },
    })).toBeUndefined();
  });

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
            defaultValue: "anonymous",
            description: "Public display name",
            enumValues: ["anonymous", "member"],
            example: "member",
            maxLength: 40,
            minLength: 2,
            name: "displayName",
            optional: false,
            pattern: "^[a-z]+$",
            type: "string",
          },
          {
            arrayItemType: "object",
            name: "items",
            objectSchema: {
              fields: [
                {
                  name: "id",
                  optional: false,
                  type: "string",
                },
              ],
              typeName: "Item",
            },
            optional: true,
            type: "array",
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects contradictory field constraints", () => {
    expect(isValidApiResponseSchema({
      fields: [{
        maxLength: 2,
        minLength: 3,
        name: "name",
        optional: false,
        type: "string",
      }],
      typeName: "InvalidResponse",
    })).toBe(false);
    expect(isValidApiResponseSchema({
      fields: [{
        maximum: 1,
        minimum: 2,
        name: "score",
        optional: false,
        type: "number",
      }],
      typeName: "InvalidResponse",
    })).toBe(false);
  });

  it("round-trips the supported JSON Schema object subset", () => {
    const schema: ApiResponseSchema = {
      fields: [
        {
          defaultValue: "anonymous",
          description: "Public display name",
          enumValues: ["anonymous", "member"],
          example: "member",
          maxLength: 40,
          minLength: 2,
          name: "display-name",
          optional: false,
          pattern: "^[a-z]+$",
          type: "string",
        },
        {
          arrayItemType: "object",
          name: "items",
          objectSchema: {
            fields: [
              { name: "id", optional: false, type: "string" },
              { name: "score", optional: true, type: "number" },
            ],
            typeName: "SearchItem",
          },
          optional: true,
          type: "array",
        },
        {
          arrayItemType: "unknown",
          name: "metadata",
          optional: true,
          type: "array",
        },
      ],
      typeName: "SearchResponse",
    };

    const jsonSchema = apiResponseSchemaToJsonSchema(schema);
    expect(jsonSchema).toEqual({
      properties: {
        "display-name": {
          default: "anonymous",
          description: "Public display name",
          enum: ["anonymous", "member"],
          examples: ["member"],
          maxLength: 40,
          minLength: 2,
          pattern: "^[a-z]+$",
          type: "string",
        },
        items: {
          items: {
            properties: {
              id: { type: "string" },
              score: { type: "number" },
            },
            required: ["id"],
            type: "object",
          },
          type: "array",
        },
        metadata: { items: {}, type: "array" },
      },
      required: ["display-name"],
      type: "object",
    });
    expect(apiResponseSchemaFromJsonSchema(
      schema.typeName,
      jsonSchema,
      schema,
    )).toBe(schema);
  });

  it("round-trips existing opaque fields without enabling new opaque authoring", () => {
    const legacySchema: ApiResponseSchema = {
      fields: [
        {
          enumValues: ["enabled"],
          name: "active",
          optional: false,
          type: "boolean",
        },
        { name: "profile", optional: false, type: "object" },
        {
          arrayItemType: "object",
          name: "items",
          optional: true,
          type: "array",
        },
        { name: "label", optional: false, type: "string" },
      ],
      typeName: "LegacyResponse",
    };
    const jsonSchema = apiResponseSchemaToJsonSchema(legacySchema);

    expect(isValidPersistedApiResponseSchema(legacySchema)).toBe(true);
    expect(apiResponseSchemaFromJsonSchema(
      legacySchema.typeName,
      jsonSchema,
      legacySchema,
    )).toBe(legacySchema);

    const edited = apiResponseSchemaFromJsonSchema(
      legacySchema.typeName,
      {
        ...jsonSchema,
        properties: {
          ...(jsonSchema.properties as Record<string, unknown>),
          label: { type: "number" },
        },
      },
      legacySchema,
    );
    expect(edited).toEqual({
      ...legacySchema,
      fields: [
        ...legacySchema.fields.slice(0, 3),
        { name: "label", optional: false, type: "number" },
      ],
    });

    expect(apiResponseSchemaFromJsonSchema("NewResponse", {
      properties: { profile: { type: "object" } },
      type: "object",
    })).toBeUndefined();
    expect(apiResponseSchemaFromJsonSchema("NewResponse", {
      properties: {
        items: { items: { type: "object" }, type: "array" },
      },
      type: "object",
    })).toBeUndefined();
  });

  it("rejects shorthand and unsupported JSON Schema semantics", () => {
    expect(apiResponseSchemaFromJsonSchema("UserResponse", {
      id: "string",
    })).toBeUndefined();
    expect(apiResponseSchemaFromJsonSchema("UserResponse", {
      properties: {
        id: { type: "integer" },
      },
      type: "object",
    })).toBeUndefined();
    expect(apiResponseSchemaFromJsonSchema("UserResponse", {
      properties: {
        id: { type: ["string", "null"] },
      },
      type: "object",
    })).toBeUndefined();
    expect(apiResponseSchemaFromJsonSchema("UserResponse", {
      properties: {
        tags: { items: { type: "array" }, type: "array" },
      },
      type: "object",
    })).toBeUndefined();
    expect(apiResponseSchemaFromJsonSchema("UserResponse", {
      additionalProperties: false,
      properties: {},
      type: "object",
    })).toBeUndefined();
    expect(apiResponseSchemaFromJsonSchema("UserResponse", {
      properties: { value: { type: "unknown" } },
      type: "object",
    })).toBeUndefined();
    expect(apiResponseSchemaFromJsonSchema("UserResponse", {
      properties: {
        active: { enum: ["enabled"], type: "boolean" },
      },
      type: "object",
    })).toBeUndefined();
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
          { name: "profile", optional: false, type: "object" },
        ],
      }),
    ).toBe(false);
    expect(
      isValidApiResponseSchema({
        typeName: "UserResponse",
        fields: [
          {
            arrayItemType: "object",
            name: "profiles",
            optional: false,
            type: "array",
          },
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

  it("requires and validates named object schemas recursively", () => {
    const address = {
      fields: [
        { name: "city", optional: false, type: "string" as const },
      ],
      typeName: "Address",
    };

    expect(isValidApiResponseSchema({
      fields: [
        {
          name: "address",
          objectSchema: address,
          optional: false,
          type: "object",
        },
        {
          arrayItemType: "object",
          name: "previousAddresses",
          objectSchema: address,
          optional: true,
          type: "array",
        },
      ],
      typeName: "UserResponse",
    })).toBe(true);

    expect(hasIncompatibleApiResponseSchema(
      [{
        fields: [
          {
            name: "address",
            objectSchema: address,
            optional: false,
            type: "object",
          },
        ],
        typeName: "UserResponse",
      }],
      {
        fields: [
          {
            name: "address",
            objectSchema: {
              fields: [
                { name: "city", optional: false, type: "number" },
              ],
              typeName: "Address",
            },
            optional: false,
            type: "object",
          },
        ],
        typeName: "AccountResponse",
      },
    )).toBe(true);
  });

  it("keeps legacy opaque objects readable without accepting them as new schemas", () => {
    const legacySchema = {
      fields: [
        { name: "profile", optional: false, type: "object" },
        {
          arrayItemType: "object",
          name: "items",
          optional: false,
          type: "array",
        },
      ],
      typeName: "LegacyResponse",
    };

    expect(isValidApiResponseSchema(legacySchema)).toBe(false);
    expect(isValidPersistedApiResponseSchema(legacySchema)).toBe(true);
  });
});
