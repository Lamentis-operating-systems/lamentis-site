import {
  apiSecuritySchemes,
  type ApiRouteSecurity,
} from "./api-route";

type ApiContractMetadataSecurity = ApiRouteSecurity & {
  scheme: Exclude<ApiRouteSecurity["scheme"], "none">;
};

export type ApiContractMetadata = {
  basePath?: string;
  security?: ApiContractMetadataSecurity;
  title?: string;
  version?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalText(value: unknown): boolean {
  return value === undefined
    || (typeof value === "string" && value.trim().length > 0);
}

function isMetadataSecurity(value: unknown): value is ApiContractMetadataSecurity {
  if (!isRecord(value)
    || !apiSecuritySchemes.some((scheme) => scheme === value.scheme)) return false;
  if (value.scheme === "none") return false;
  if (value.scheme === "apiKey") {
    return typeof value.name === "string" && value.name.trim().length > 0
      && ["query", "header", "cookie"].includes(String(value.location));
  }
  if (value.scheme === "cookie") {
    return typeof value.name === "string" && value.name.trim().length > 0
      && value.location === "cookie";
  }
  if (value.scheme === "oauth2") {
    return value.scopes === undefined || (
      Array.isArray(value.scopes)
      && value.scopes.every((scope) => typeof scope === "string" && scope.trim())
    );
  }
  return value.name === undefined
    && value.location === undefined
    && value.scopes === undefined;
}

export function isApiContractMetadata(value: unknown): value is ApiContractMetadata {
  return isRecord(value)
    && optionalText(value.title)
    && optionalText(value.version)
    && optionalText(value.basePath)
    && (value.basePath === undefined || String(value.basePath).startsWith("/"))
    && (value.security === undefined || isMetadataSecurity(value.security));
}
