import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  apiContractsAgentSkillFileName,
  generateApiContractsAgentSkill,
} from "@/domain/site/api-contract-skill";
import type { ApiRouteContract } from "@/domain/site/api-route";
import {
  isValidTypeScriptTypeName,
  type ApiResponseSchema,
} from "@/domain/site/api-response-schema";

const userResponse: ApiResponseSchema = {
  fields: [
    {
      name: "tags",
      optional: true,
      type: "array",
      arrayItemType: "string",
    },
    {
      name: "displayName",
      optional: false,
      type: "string",
    },
  ],
  typeName: "UserResponse",
};

function occurrences(value: string, pattern: string): number {
  return value.split(pattern).length - 1;
}

function typeScriptBlocks(markdown: string): string {
  return [...markdown.matchAll(/```ts\n([\s\S]*?)\n```/g)]
    .map((match) => match[1])
    .filter((block): block is string => Boolean(block))
    .join("\n\n");
}

function typeScriptDiagnostics(source: string): string[] {
  const fileName = "/generated-api-contracts.ts";
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
  };
  const defaultHost = ts.createCompilerHost(compilerOptions);
  const compilerHost: ts.CompilerHost = {
    ...defaultHost,
    fileExists: (candidate) => (
      candidate === fileName || defaultHost.fileExists(candidate)
    ),
    getSourceFile: (
      candidate,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) => (
      candidate === fileName
        ? ts.createSourceFile(candidate, source, languageVersion, true)
        : defaultHost.getSourceFile(
          candidate,
          languageVersion,
          onError,
          shouldCreateNewSourceFile,
        )
    ),
    readFile: (candidate) => (
      candidate === fileName ? source : defaultHost.readFile(candidate)
    ),
    writeFile: () => {},
  };
  const program = ts.createProgram(
    [fileName],
    compilerOptions,
    compilerHost,
  );

  return ts.getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n",
    ));
}

describe("API-contract agent skill", () => {
  it("accepts only interface names that compile in the pinned TypeScript", () => {
    const keywordCandidates = Array.from(
      {
        length:
          ts.SyntaxKind.LastKeyword - ts.SyntaxKind.FirstKeyword + 1,
      },
      (_, index) => ts.tokenToString(ts.SyntaxKind.FirstKeyword + index),
    ).filter((candidate): candidate is string => Boolean(candidate));
    const intrinsicTypeCandidates = [
      "any",
      "bigint",
      "boolean",
      "never",
      "number",
      "object",
      "string",
      "symbol",
      "undefined",
      "unknown",
    ];
    const acceptedCandidates = [
      ...new Set([...keywordCandidates, ...intrinsicTypeCandidates]),
    ].filter(isValidTypeScriptTypeName);
    const declarations = acceptedCandidates
      .map((candidate) => `export interface ${candidate} {}`)
      .join("\n");

    expect(typeScriptDiagnostics(declarations)).toEqual([]);
  });

  it("does not collide with Array or Record model names", () => {
    const skill = generateApiContractsAgentSkill([
      {
        id: 0,
        method: "GET",
        path: "/arrays",
        response: {
          fields: [
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
                typeName: "ArrayItem",
              },
              optional: false,
              type: "array",
            },
          ],
          typeName: "Array",
        },
      },
      {
        id: 1,
        method: "GET",
        path: "/records",
        response: {
          fields: [],
          typeName: "Record",
        },
      },
    ]);

    expect(skill).toContain("items: ArrayItem[];");
    expect(skill).toContain("export interface ArrayItem {");
    expect(skill).toContain(
      "export type Record = { [key: string]: never };",
    );
    expect(typeScriptDiagnostics(typeScriptBlocks(skill))).toEqual([]);
  });

  it("preserves legacy opaque object contracts without inventing fields", () => {
    const skill = generateApiContractsAgentSkill([
      {
        id: 0,
        method: "GET",
        path: "/legacy",
        response: {
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
        },
      },
    ]);

    expect(skill).toContain(
      "profile: { [key: string]: unknown };",
    );
    expect(skill).toContain(
      "items: ({ [key: string]: unknown })[];",
    );
    expect(typeScriptDiagnostics(typeScriptBlocks(skill))).toEqual([]);
  });

  it("renders one deterministic, sorted contract per method and path", () => {
    const routes: ApiRouteContract[] = [
      {
        id: 9,
        method: "PATCH",
        path: "/users/{uuid}",
        response: userResponse,
      },
      {
        id: 7,
        method: "GET",
        path: "/users/{uuid}",
        response: userResponse,
      },
      {
        id: 4,
        method: "POST",
        path: "/users",
      },
      {
        id: 2,
        method: "GET",
        path: "/users/{uuid}",
        response: {
          ...userResponse,
          fields: [...userResponse.fields].reverse(),
        },
      },
    ];

    const skill = generateApiContractsAgentSkill(routes);

    expect(apiContractsAgentSkillFileName).toBe(
      "api-contracts-agent-skill.md",
    );
    expect(generateApiContractsAgentSkill([...routes].reverse())).toBe(skill);
    expect(skill.startsWith("---\nname: implement-api-contracts\n"))
      .toBe(true);
    expect(occurrences(skill, "### `GET /users/{uuid}`")).toBe(1);
    expect(occurrences(skill, "### `UserResponse`")).toBe(1);
    expect(skill.indexOf("### `POST /users`")).toBeLessThan(
      skill.indexOf("### `GET /users/{uuid}`"),
    );
    expect(skill.indexOf("### `GET /users/{uuid}`")).toBeLessThan(
      skill.indexOf("### `PATCH /users/{uuid}`"),
    );
    expect(skill).toContain(
      "2 identical source entries were collapsed into this contract.",
    );
    expect(skill.indexOf("displayName: string;")).toBeLessThan(
      skill.indexOf("tags?: string[];"),
    );
    expect(skill).toContain("Path parameters: `uuid`");
    expect(skill).not.toContain("id: 9");

    expect(typeScriptDiagnostics(typeScriptBlocks(skill))).toEqual([]);
  });

  it("marks route and response-model conflicts as blocking conditions", () => {
    const skill = generateApiContractsAgentSkill([
      {
        id: 0,
        method: "GET",
        path: "/users",
        response: {
          fields: [
            { name: "id", optional: false, type: "string" },
          ],
          typeName: "UserResponse",
        },
      },
      {
        id: 1,
        method: "GET",
        path: "/users",
      },
      {
        id: 2,
        method: "GET",
        path: "/accounts",
        response: {
          fields: [
            { name: "accountId", optional: false, type: "number" },
          ],
          typeName: "UserResponse",
        },
      },
    ]);

    expect(skill).toContain(
      "**BLOCKED: conflicting response definitions**",
    );
    expect(skill).toContain("### `UserResponse` — BLOCKED");
    expect(skill).toContain(
      "Ask the contract owner to resolve it before implementation.",
    );
  });

  it("stops instead of inventing work when no contracts exist", () => {
    const skill = generateApiContractsAgentSkill([]);

    expect(skill).toContain("No API contracts are defined.");
    expect(skill).toContain(
      "Stop and ask for contract definitions; do not create speculative routes.",
    );
    expect(skill).toContain("No response models are defined.");
  });

  it("exports request models and a deterministic pagination wrapper", () => {
    const skill = generateApiContractsAgentSkill([{
      id: 0,
      method: "POST",
      path: "/users/search",
      paginated: true,
      request: {
        fields: [{ name: "query", optional: false, type: "string" }],
        typeName: "UserSearchRequest",
      },
      response: userResponse,
    }]);

    expect(skill).toContain("- Request model: `UserSearchRequest`");
    expect(skill).toContain("- Response model: `UserResponsePage`");
    expect(skill).toContain("items: UserResponse[];");
    expect(skill).toContain("totalHits: number;");
    expect(skill).toContain("page: number;");
    expect(skill).toContain("limit: number;");
    expect(skill).toContain("totalPages: number;");
    expect(typeScriptDiagnostics(typeScriptBlocks(skill))).toEqual([]);
  });

  it("exports global details, serialization, field rules, and JSON examples", () => {
    const skill = generateApiContractsAgentSkill([{
      id: 0,
      method: "GET",
      parameters: [{
        defaultValue: "25",
        enumValues: ["10", "25", "50"],
        location: "query",
        name: "limit",
        required: false,
        serialization: "comma",
        type: "array",
      }],
      path: "/users",
      responses: [{
        contentTypes: ["application/json"],
        description: "Invalid query",
        example: { code: "INVALID_LIMIT" },
        schema: {
          fields: [{
            description: "Stable machine-readable code",
            enumValues: ["INVALID_LIMIT"],
            example: "INVALID_LIMIT",
            name: "code",
            optional: false,
            type: "string",
          }],
          typeName: "ErrorResponse",
        },
        status: "400",
      }],
    }], {
      basePath: "/api/v1",
      security: { scheme: "bearer" },
      title: "Accounts API",
      version: "1.0.0",
    });

    expect(skill).toContain("Title: Accounts API");
    expect(skill).toContain("Base path: `/api/v1`");
    expect(skill).toContain("Default security: bearer");
    expect(skill).toContain("serialization comma");
    expect(skill).toContain("allowed values: `INVALID_LIMIT`");
    expect(skill).toContain('"code": "INVALID_LIMIT"');
    expect(skill).toContain("Security: Inherit API default");
  });

  it("distinguishes an explicitly public route from inherited API security", () => {
    const skill = generateApiContractsAgentSkill([{
      id: 0,
      method: "GET",
      path: "/health",
      security: { scheme: "none" },
    }], {
      basePath: "/api",
      security: { scheme: "bearer" },
      title: "Health API",
      version: "1.0.0",
    });

    expect(skill).toContain("Default security: bearer");
    expect(skill).toContain("Security: None (explicit route override)");
    expect(skill).not.toContain("Security: Inherit API default");
  });
});
