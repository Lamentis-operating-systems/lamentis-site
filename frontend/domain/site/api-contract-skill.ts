import {
  apiRouteIdentity,
  httpMethods,
  type ApiRouteContract,
  type HttpMethod,
} from "./api-route";
import { parseApiRoutePath } from "./api-route-path";
import {
  apiResponseSchemaSignature,
  canonicalizeApiResponseSchema,
  collectApiResponseSchemas,
  type ApiResponseField,
  type ApiResponseSchema,
} from "./api-response-schema";

export const apiContractsAgentSkillFileName =
  "api-contracts-agent-skill.md";

type CanonicalRouteGroup = {
  method: HttpMethod;
  path: string;
  sourceCount: number;
  variants: ApiResponseSchemaOrNone[];
};

type ApiResponseSchemaOrNone = ApiResponseSchema | null;

type ResponseModelGroup = {
  typeName: string;
  variants: ApiResponseSchema[];
};

const methodOrder = new Map<HttpMethod, number>(
  httpMethods.map((method, index) => [method, index]),
);

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareRoutes(
  left: Pick<CanonicalRouteGroup, "method" | "path">,
  right: Pick<CanonicalRouteGroup, "method" | "path">,
): number {
  const pathOrder = compareText(left.path, right.path);
  if (pathOrder !== 0) return pathOrder;
  return (methodOrder.get(left.method) ?? 0)
    - (methodOrder.get(right.method) ?? 0);
}

function responseSignature(schema: ApiResponseSchemaOrNone): string {
  if (!schema) return "no-response";
  return apiResponseSchemaSignature(schema);
}

function canonicalRouteGroups(
  routes: readonly ApiRouteContract[],
): CanonicalRouteGroup[] {
  const groups = new Map<string, {
    method: HttpMethod;
    path: string;
    responses: Map<string, ApiResponseSchemaOrNone>;
    sourceCount: number;
  }>();

  for (const route of routes) {
    const identity = apiRouteIdentity(route);
    const group = groups.get(identity) ?? {
      method: route.method,
      path: route.path,
      responses: new Map<string, ApiResponseSchemaOrNone>(),
      sourceCount: 0,
    };
    const response = route.response
      ? canonicalizeApiResponseSchema(route.response)
      : null;

    group.sourceCount += 1;
    group.responses.set(responseSignature(response), response);
    groups.set(identity, group);
  }

  return [...groups.values()]
    .map((group) => ({
      method: group.method,
      path: group.path,
      sourceCount: group.sourceCount,
      variants: [...group.responses.entries()]
        .sort(([left], [right]) => compareText(left, right))
        .map(([, response]) => response),
    }))
    .sort(compareRoutes);
}

function responseModelGroups(
  routes: readonly ApiRouteContract[],
): ResponseModelGroup[] {
  const groups = new Map<string, Map<string, ApiResponseSchema>>();

  for (const route of routes) {
    if (!route.response) continue;

    for (const responseSchema of collectApiResponseSchemas(route.response)) {
      const schema = canonicalizeApiResponseSchema(responseSchema);
      const variants = groups.get(schema.typeName)
        ?? new Map<string, ApiResponseSchema>();
      variants.set(responseSignature(schema), schema);
      groups.set(schema.typeName, variants);
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([typeName, variants]) => ({
      typeName,
      variants: [...variants.entries()]
        .sort(([left], [right]) => compareText(left, right))
        .map(([, schema]) => schema),
    }));
}

function pathParameters(path: string): string[] {
  return (parseApiRoutePath(path)?.segments ?? []).flatMap((segment) => (
    segment.kind === "parameter" ? [segment.name] : []
  ));
}

function typeScriptFieldType(field: ApiResponseField): string {
  if (field.type === "object") {
    return field.objectSchema?.typeName
      ?? "{ [key: string]: unknown }";
  }
  if (field.type !== "array") return field.type;

  const itemType = field.arrayItemType === "object"
    ? field.objectSchema?.typeName
      ?? "{ [key: string]: unknown }"
    : field.arrayItemType ?? "unknown";
  return itemType.startsWith("{")
    ? `(${itemType})[]`
    : `${itemType}[]`;
}

function renderTypeScriptModel(schema: ApiResponseSchema): string {
  if (schema.fields.length === 0) {
    return `export type ${schema.typeName} = { [key: string]: never };`;
  }

  const fields = schema.fields.map((field) => (
    `  ${field.name}${field.optional ? "?" : ""}: ${
      typeScriptFieldType(field)
    };`
  ));

  return [
    `export interface ${schema.typeName} {`,
    ...fields,
    "}",
  ].join("\n");
}

function renderInventory(groups: readonly CanonicalRouteGroup[]): string {
  if (groups.length === 0) {
    return [
      "No API contracts are defined.",
      "Stop and ask for contract definitions; do not create speculative routes.",
    ].join("\n\n");
  }

  const rows = groups.map((group) => {
    const parameters = pathParameters(group.path);
    const response = group.variants.length > 1
      ? "**BLOCKED: conflicting response definitions**"
      : group.variants[0]?.typeName ?? "Not specified";

    return `| ${group.method} | \`${group.path}\` | ${
      parameters.length > 0
        ? parameters.map((parameter) => `\`${parameter}\``).join(", ")
        : "None"
    } | ${response} |`;
  });

  return [
    "| Method | Path | Path parameters | Response |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function renderRouteContract(group: CanonicalRouteGroup): string {
  const parameters = pathParameters(group.path);
  const lines = [
    `### \`${group.method} ${group.path}\``,
    "",
    `- Canonical identity: \`${group.method} ${group.path}\``,
    `- Path parameters: ${
      parameters.length > 0
        ? parameters.map((parameter) => `\`${parameter}\``).join(", ")
        : "None"
    }`,
    "- Request body: Not specified. Do not invent one.",
  ];

  if (group.variants.length > 1) {
    lines.push(
      "- Response: **BLOCKED**. Multiple incompatible response definitions exist.",
      "- Required action: resolve this conflict with the contract owner before implementation.",
      "",
      "Conflicting response variants:",
      ...group.variants.map((variant, index) => (
        `- Variant ${index + 1}: ${
          variant ? `\`${variant.typeName}\`` : "No response specified"
        }`
      )),
    );
  } else if (group.variants[0]) {
    lines.push(`- Response model: \`${group.variants[0].typeName}\``);
  } else {
    lines.push("- Response: Not specified. Do not invent a response body.");
  }

  if (group.sourceCount > 1 && group.variants.length === 1) {
    lines.push(
      `- Normalization: ${group.sourceCount} identical source entries were collapsed into this contract.`,
    );
  }

  return lines.join("\n");
}

function renderResponseModels(groups: readonly ResponseModelGroup[]): string {
  if (groups.length === 0) {
    return "No response models are defined.";
  }

  return groups.map((group) => {
    if (group.variants.length === 1 && group.variants[0]) {
      return [
        `### \`${group.typeName}\``,
        "",
        "```ts",
        renderTypeScriptModel(group.variants[0]),
        "```",
      ].join("\n");
    }

    return [
      `### \`${group.typeName}\` — BLOCKED`,
      "",
      "Multiple incompatible definitions use this TypeScript model name.",
      "Resolve the conflict before creating or changing the model.",
      "",
      ...group.variants.flatMap((variant, index) => [
        `#### Variant ${index + 1}`,
        "",
        "```ts",
        renderTypeScriptModel(variant),
        "```",
        "",
      ]),
    ].join("\n").trimEnd();
  }).join("\n\n");
}

export function generateApiContractsAgentSkill(
  routes: readonly ApiRouteContract[],
): string {
  const routeGroups = canonicalRouteGroups(routes);
  const modelGroups = responseModelGroups(routes);
  const contracts = routeGroups.length > 0
    ? routeGroups.map(renderRouteContract).join("\n\n")
    : "No route contracts are available.";

  return [
    "---",
    "name: implement-api-contracts",
    "description: Implement canonical API route contracts in an existing project without duplicate handlers or divergent models.",
    "---",
    "",
    "# Implement API contracts",
    "",
    "## Objective",
    "",
    "Implement the contracts in this document in the target repository while preserving its existing architecture, framework conventions, and public behavior.",
    "",
    "## Source-of-truth rules",
    "",
    "1. Treat `METHOD + path` as the only canonical route identity.",
    "2. Inventory the target repository before editing. Map every contract to an existing handler, router, controller, service, model, and test when present.",
    "3. Reuse an existing implementation for the same canonical identity. Never register a second handler for it.",
    "4. Keep every response model in one canonical TypeScript definition. Reuse it wherever referenced.",
    "5. Preserve parameter names exactly as written in the path.",
    "6. Do not invent authentication, authorization, request bodies, status codes, persistence, errors, or response fields that are not specified here.",
    "7. Treat every `BLOCKED` conflict as a stop condition. Ask the contract owner to resolve it before implementation.",
    "8. Follow the target project's validation, formatting, test, and build commands.",
    "",
    "## Required workflow",
    "",
    "1. Produce a pre-change inventory mapping each canonical identity to existing code or `missing`.",
    "2. Consolidate duplicate existing registrations before adding missing work.",
    "3. Implement the smallest architecture-consistent change for each missing contract.",
    "4. Add or update one focused contract test per route identity.",
    "5. Run the repository's relevant static checks and tests.",
    "6. Report changed files, implemented identities, reused identities, removed duplicates, verification evidence, and unresolved specifications.",
    "",
    "## Canonical contract inventory",
    "",
    renderInventory(routeGroups),
    "",
    "## Route contracts",
    "",
    contracts,
    "",
    "## Canonical TypeScript response models",
    "",
    renderResponseModels(modelGroups),
    "",
    "## Acceptance checklist",
    "",
    "- [ ] Every listed `METHOD + path` exists exactly once in the runtime router.",
    "- [ ] No unlisted route, request field, response field, or status behavior was invented.",
    "- [ ] Path parameter names match this document exactly.",
    "- [ ] Each response model has one canonical TypeScript definition.",
    "- [ ] Conflicts marked `BLOCKED` were resolved by the contract owner before implementation.",
    "- [ ] Focused route tests and the target repository's required gates pass.",
    "- [ ] The final report distinguishes implemented, reused, deduplicated, blocked, and unspecified work.",
    "",
  ].join("\n");
}
