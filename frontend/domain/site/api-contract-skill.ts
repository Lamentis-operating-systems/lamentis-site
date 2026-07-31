import {
  apiRouteRequestSchema,
  apiRouteResponses,
  apiRouteIdentity,
  httpMethods,
  type ApiRouteContract,
  type ApiRouteParameter,
  type ApiRouteResponse,
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
  variants: CanonicalRouteVariant[];
};

type ApiResponseSchemaOrNone = ApiResponseSchema | null;

type CanonicalRouteVariant = {
  behavior: ApiRouteContract["behavior"];
  deprecated: boolean;
  description: string | null;
  operationId: string | null;
  paginated: boolean;
  parameters: ApiRouteParameter[];
  request: ApiResponseSchemaOrNone;
  requestBody: ApiRouteContract["requestBody"] | null;
  response: ApiResponseSchemaOrNone;
  responses: ApiRouteResponse[];
  security: ApiRouteContract["security"] | null;
  tags: string[];
  title: string | null;
};

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

function routeVariantSignature(variant: CanonicalRouteVariant): string {
  return JSON.stringify(variant);
}

function paginationSchema(response: ApiResponseSchema): ApiResponseSchema {
  return {
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
    typeName: `${response.typeName}Page`,
  };
}

function responseModelName(variant: CanonicalRouteVariant): string | null {
  const primary = variant.responses.find((response) => (
    response.schema && /^2[0-9]{2}$/.test(response.status)
  )) ?? variant.responses.find((response) => response.schema);
  if (!primary?.schema) return null;
  return primary.paginated
    ? paginationSchema(primary.schema).typeName
    : primary.schema.typeName;
}

function canonicalRouteGroups(
  routes: readonly ApiRouteContract[],
): CanonicalRouteGroup[] {
  const groups = new Map<string, {
    method: HttpMethod;
    path: string;
    variants: Map<string, CanonicalRouteVariant>;
    sourceCount: number;
  }>();

  for (const route of routes) {
    const identity = apiRouteIdentity(route);
    const group = groups.get(identity) ?? {
      method: route.method,
      path: route.path,
      variants: new Map<string, CanonicalRouteVariant>(),
      sourceCount: 0,
    };
    const variant: CanonicalRouteVariant = {
      behavior: route.behavior,
      deprecated: route.deprecated === true,
      description: route.description ?? null,
      operationId: route.operationId ?? null,
      paginated: route.paginated === true,
      parameters: route.parameters ?? [],
      request: apiRouteRequestSchema(route)
        ? canonicalizeApiResponseSchema(apiRouteRequestSchema(route)!)
        : null,
      requestBody: route.requestBody ?? (route.request
        ? {
            contentTypes: ["application/json"],
            required: false,
            schema: canonicalizeApiResponseSchema(route.request),
          }
        : null),
      response: route.response
        ? canonicalizeApiResponseSchema(route.response)
        : null,
      responses: apiRouteResponses(route).map((response) => ({
        ...response,
        ...(response.schema
          ? { schema: canonicalizeApiResponseSchema(response.schema) }
          : {}),
      })),
      security: route.security ?? null,
      tags: route.tags ?? [],
      title: route.title ?? null,
    };

    group.sourceCount += 1;
    group.variants.set(routeVariantSignature(variant), variant);
    groups.set(identity, group);
  }

  return [...groups.values()]
    .map((group) => ({
      method: group.method,
      path: group.path,
      sourceCount: group.sourceCount,
      variants: [...group.variants.entries()]
        .sort(([left], [right]) => compareText(left, right))
        .map(([, variant]) => variant),
    }))
    .sort(compareRoutes);
}

function responseModelGroups(
  routes: readonly ApiRouteContract[],
): ResponseModelGroup[] {
  const groups = new Map<string, Map<string, ApiResponseSchema>>();

  for (const route of routes) {
    const responseSchemas = apiRouteResponses(route).flatMap((response) => (
      response.schema
        ? [response.paginated ? paginationSchema(response.schema) : response.schema]
        : []
    ));
    const rootSchemas = [
      apiRouteRequestSchema(route),
      ...responseSchemas,
    ].filter((schema): schema is ApiResponseSchema => Boolean(schema));

    for (const responseSchema of rootSchemas.flatMap(collectApiResponseSchemas)) {
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
    const variant = group.variants[0];
    const request = group.variants.length > 1
      ? "**BLOCKED: conflicting definitions**"
      : variant?.request?.typeName ?? "Not specified";
    const response = group.variants.length > 1
      ? "**BLOCKED: conflicting response definitions**"
      : variant ? responseModelName(variant) ?? "Not specified" : "Not specified";

    return `| ${group.method} | \`${group.path}\` | ${
      parameters.length > 0
        ? parameters.map((parameter) => `\`${parameter}\``).join(", ")
        : "None"
    } | ${request} | ${response} |`;
  });

  return [
    "| Method | Path | Path parameters | Request | Response |",
    "| --- | --- | --- | --- | --- |",
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
  ];

  if (group.variants.length > 1) {
    lines.push(
      "- Response: **BLOCKED**. Multiple incompatible response definitions exist.",
      "- Required action: resolve this conflict with the contract owner before implementation.",
      "",
      "Conflicting contract variants:",
      ...group.variants.map((variant, index) => (
        `- Variant ${index + 1}: request ${
          variant.request ? `\`${variant.request.typeName}\`` : "not specified"
        }, response ${
          responseModelName(variant)
            ? `\`${responseModelName(variant)}\``
            : "not specified"
        }`
      )),
    );
  } else {
    const variant = group.variants[0];
    if (variant) {
      lines.push(
        `- Title: ${variant.title ? variant.title : "Not specified"}`,
        `- Operation ID: ${variant.operationId ? `\`${variant.operationId}\`` : "Not specified"}`,
        `- Description: ${variant.description ?? "Not specified"}`,
        `- Tags: ${variant.tags.length > 0 ? variant.tags.map((tag) => `\`${tag}\``).join(", ") : "None"}`,
        `- Deprecated: ${variant.deprecated ? "Yes" : "No"}`,
      );
      if (variant.parameters.length === 0) {
        lines.push("- Parameters: None specified.");
      } else {
        lines.push(
          "- Parameters:",
          ...variant.parameters.map((parameter) => (
            `  - \`${parameter.name}\` in ${parameter.location}: ${parameter.type}${
              parameter.format ? ` (${parameter.format})` : ""
            }, ${parameter.required ? "required" : "optional"}${
              parameter.description ? ` — ${parameter.description}` : ""
            }`
          )),
        );
      }
      lines.push(variant.requestBody
        ? `- Request body: ${variant.requestBody.required ? "required" : "optional"}; ${
            variant.requestBody.contentTypes.map((type) => `\`${type}\``).join(", ") || "no content type"
          }; model ${variant.requestBody.schema ? `\`${variant.requestBody.schema.typeName}\`` : "not specified"}`
        : "- Request body: Not specified. Do not invent one.");
      lines.push(
        `- Request model: ${variant.request ? `\`${variant.request.typeName}\`` : "Not specified"}`,
        `- Response model: ${responseModelName(variant) ? `\`${responseModelName(variant)}\`` : "Not specified"}`,
      );
      if (variant.responses.length === 0) {
        lines.push("- Responses: Not specified. Do not invent response behavior.");
      } else {
        lines.push(
          "- Responses:",
          ...variant.responses.flatMap((response) => {
            const responseName = response.schema
              ? response.paginated
                ? paginationSchema(response.schema).typeName
                : response.schema.typeName
              : null;
            return [
              `  - \`${response.status}\`: ${response.description}; model ${
                responseName ? `\`${responseName}\`` : "not specified"
              }; content ${
                response.contentTypes.map((type) => `\`${type}\``).join(", ") || "none"
              }`,
              ...(response.headers ?? []).map((header) => (
                `    - Header \`${header.name}\`: ${header.type}${
                  header.description ? ` — ${header.description}` : ""
                }`
              )),
              ...(response.paginated && response.schema
                ? [`    - Pagination wraps \`${response.schema.typeName}\` in \`items\` and includes \`totalHits\`, \`page\`, \`limit\`, and \`totalPages\`.`]
                : []),
            ];
          }),
        );
      }
      lines.push(
        `- Security: ${variant.security && variant.security.scheme !== "none"
          ? `${variant.security.scheme}${variant.security.name ? ` (\`${variant.security.name}\`)` : ""}${
              variant.security.scopes?.length ? `; scopes ${variant.security.scopes.map((scope) => `\`${scope}\``).join(", ")}` : ""
            }`
          : "None"}`,
        `- Cache policy: ${variant.behavior?.cache ?? "Unspecified"}`,
        `- Idempotency: ${variant.behavior?.idempotency ?? "Unspecified"}`,
        `- Rate limit: ${variant.behavior?.rateLimit ?? "Unspecified"}`,
      );
    }
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
    "4. Keep every request and response model in one canonical TypeScript definition. Reuse it wherever referenced.",
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
    "## Canonical TypeScript request and response models",
    "",
    renderResponseModels(modelGroups),
    "",
    "## Acceptance checklist",
    "",
    "- [ ] Every listed `METHOD + path` exists exactly once in the runtime router.",
    "- [ ] No unlisted route, request field, response field, or status behavior was invented.",
    "- [ ] Path parameter names match this document exactly.",
    "- [ ] Each request and response model has one canonical TypeScript definition.",
    "- [ ] Conflicts marked `BLOCKED` were resolved by the contract owner before implementation.",
    "- [ ] Focused route tests and the target repository's required gates pass.",
    "- [ ] The final report distinguishes implemented, reused, deduplicated, blocked, and unspecified work.",
    "",
  ].join("\n");
}
