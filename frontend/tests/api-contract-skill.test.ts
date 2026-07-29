import { describe, expect, it } from "vitest";
import {
  apiContractsAgentSkillFileName,
  generateApiContractsAgentSkill,
} from "@/domain/site/api-contract-skill";
import type { ApiRouteContract } from "@/domain/site/api-route";
import type { ApiResponseSchema } from "@/domain/site/api-response-schema";

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

describe("API-contract agent skill", () => {
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
});
