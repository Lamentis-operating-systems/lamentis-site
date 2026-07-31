"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import {
  apiCachePolicies,
  apiIdempotencyPolicies,
  apiParameterLocations,
  apiParameterTypes,
  apiSecuritySchemes,
  type ApiParameterLocation,
  type ApiRouteContract,
  type ApiRouteParameter,
  type ApiSecurityScheme,
  type HttpMethod,
} from "@/domain/site/api-route";
import {
  deriveApiRouteSuggestions,
  synchronizePathParameters,
} from "@/domain/site/api-route-suggestions";
import type { ResponseSchemaEditorContent } from "@/domain/site/content";
import { CheckboxWithLabel } from "./form/checkbox-with-label";
import { TextInput } from "./form/text-input";
import { IconButton } from "./icon-button";
import { CloseIcon } from "./icons/close-icon";
import { PlusIcon } from "./icons/plus-icon";
import { SelectMenu, type SelectMenuOption } from "./select-menu";
import styles from "./response-schema-editor.module.css";

type ParameterDraft = ApiRouteParameter & { id: number };

type RouteContractDetails = Pick<
  ApiRouteContract,
  | "behavior"
  | "deprecated"
  | "description"
  | "operationId"
  | "parameters"
  | "security"
  | "tags"
  | "title"
>;

export type RouteContractDetailsHandle = {
  getContract: () => RouteContractDetails;
  updateIdentity: (method: HttpMethod, path: string) => void;
};

type RouteContractDetailsEditorProps = {
  content: ResponseSchemaEditorContent["routeContract"];
  route: ApiRouteContract;
};

function commaSeparatedValues(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function LabeledInput({
  hint,
  label,
  ...props
}: ComponentPropsWithoutRef<typeof TextInput> & {
  hint?: string;
  label: string;
}) {
  return (
    <label className={styles.contractField}>
      <span className={styles.label}>{label}</span>
      <TextInput
        {...props}
        aria-label={label}
        placeholder={hint ?? label}
        tone="nested"
      />
    </label>
  );
}

export const RouteContractDetailsEditor = forwardRef<
  RouteContractDetailsHandle,
  RouteContractDetailsEditorProps
>(function RouteContractDetailsEditor({ content, route }, ref) {
  const initialSuggestions = deriveApiRouteSuggestions(route.method, route.path);
  const suggestionRef = useRef(initialSuggestions);
  const [title, setTitle] = useState(route.title ?? initialSuggestions.title);
  const [description, setDescription] = useState(route.description ?? "");
  const [operationId, setOperationId] = useState(
    route.operationId ?? initialSuggestions.operationId,
  );
  const [tags, setTags] = useState((route.tags ?? []).join(", "));
  const [deprecated, setDeprecated] = useState(route.deprecated === true);
  const [parameters, setParameters] = useState<ParameterDraft[]>(() => (
    (route.parameters ?? initialSuggestions.parameters).map((parameter, id) => ({
      ...parameter,
      id,
    }))
  ));
  const nextParameterIdRef = useRef(parameters.length);
  const [securityScheme, setSecurityScheme] = useState<ApiSecurityScheme>(
    route.security?.scheme ?? "none",
  );
  const [securityName, setSecurityName] = useState(route.security?.name ?? "");
  const [securityLocation, setSecurityLocation] = useState<
    Exclude<ApiParameterLocation, "path">
  >(route.security?.location ?? "header");
  const [securityScopes, setSecurityScopes] = useState(
    (route.security?.scopes ?? []).join(", "),
  );
  const [cache, setCache] = useState(route.behavior?.cache ?? "unspecified");
  const [idempotency, setIdempotency] = useState(
    route.behavior?.idempotency ?? "unspecified",
  );
  const [rateLimit, setRateLimit] = useState(route.behavior?.rateLimit ?? "");

  useImperativeHandle(ref, () => ({
    getContract() {
      const normalizedParameters = parameters
        .filter((parameter) => parameter.name.trim().length > 0)
        .map((parameter): ApiRouteParameter => ({
          ...(parameter.description?.trim()
            ? { description: parameter.description.trim() }
            : {}),
          ...(parameter.format?.trim()
            ? { format: parameter.format.trim() }
            : {}),
          location: parameter.location,
          name: parameter.name.trim(),
          required: parameter.location === "path" ? true : parameter.required,
          type: parameter.type,
        }));
      const behavior = {
        ...(cache !== "unspecified" ? { cache } : {}),
        ...(idempotency !== "unspecified" ? { idempotency } : {}),
        ...(rateLimit.trim() ? { rateLimit: rateLimit.trim() } : {}),
      };
      return {
        ...(Object.keys(behavior).length > 0 ? { behavior } : {}),
        ...(deprecated ? { deprecated: true } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(operationId.trim() ? { operationId: operationId.trim() } : {}),
        ...(normalizedParameters.length > 0
          ? { parameters: normalizedParameters }
          : {}),
        ...(securityScheme === "none" ? {} : { security: {
              scheme: securityScheme,
              ...((securityScheme === "apiKey" || securityScheme === "cookie")
                && securityName.trim()
                ? { name: securityName.trim() }
                : {}),
              ...(securityScheme === "apiKey" || securityScheme === "cookie"
                ? { location: securityLocation }
                : {}),
              ...(securityScheme === "oauth2"
                && commaSeparatedValues(securityScopes).length > 0
                ? { scopes: commaSeparatedValues(securityScopes) }
                : {}),
            } }),
        ...(commaSeparatedValues(tags).length > 0
          ? { tags: commaSeparatedValues(tags) }
          : {}),
        ...(title.trim() ? { title: title.trim() } : {}),
      };
    },
    updateIdentity(method, path) {
      const previous = suggestionRef.current;
      const next = deriveApiRouteSuggestions(method, path);
      setTitle((current) => (
        current.length === 0 || current === previous.title ? next.title : current
      ));
      setOperationId((current) => (
        current.length === 0 || current === previous.operationId
          ? next.operationId
          : current
      ));
      setParameters((current) => synchronizePathParameters(current, path).map(
        (parameter) => {
          const existing = current.find((candidate) => (
            candidate.location === parameter.location
            && candidate.name === parameter.name
          ));
          return existing ?? { ...parameter, id: nextParameterIdRef.current++ };
        },
      ));
      suggestionRef.current = next;
    },
  }), [
    cache,
    deprecated,
    description,
    idempotency,
    operationId,
    parameters,
    rateLimit,
    securityLocation,
    securityName,
    securityScheme,
    securityScopes,
    tags,
    title,
  ]);

  function addParameter() {
    setParameters((current) => [
      ...current,
      {
        id: nextParameterIdRef.current++,
        location: "query",
        name: "",
        required: false,
        type: "string",
      },
    ]);
  }

  function updateParameter(id: number, patch: Partial<ApiRouteParameter>) {
    setParameters((current) => current.map((parameter) => (
      parameter.id === id ? { ...parameter, ...patch } : parameter
    )));
  }

  function removeParameter(id: number) {
    setParameters((current) => current.filter((parameter) => parameter.id !== id));
  }

  const securityNeedsName = securityScheme === "apiKey" || securityScheme === "cookie";

  return (
    <div className={styles.contractDefinition}>
      <div className={styles.contractFieldGrid}>
        <LabeledInput
          label={content.titleLabel}
          name="route-title"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
        <LabeledInput
          label={content.operationIdLabel}
          name="operation-id"
          pattern="[A-Za-z_$][A-Za-z0-9_$]*"
          value={operationId}
          onChange={(event) => setOperationId(event.currentTarget.value)}
        />
        <LabeledInput
          className={styles.contractWideField}
          label={content.descriptionLabel}
          name="route-description"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
        />
        <LabeledInput
          hint={content.tagsHint}
          label={content.tagsLabel}
          name="route-tags"
          value={tags}
          onChange={(event) => setTags(event.currentTarget.value)}
        />
        <CheckboxWithLabel
          checked={deprecated}
          label={content.deprecatedLabel}
          onChange={(event) => setDeprecated(event.currentTarget.checked)}
        />
      </div>

      <div className={styles.contractSubsectionHeader}>
        <span className={styles.label}>{content.parametersLabel}</span>
        <IconButton aria-label={content.addParameterLabel} onClick={addParameter}>
          <PlusIcon />
        </IconButton>
      </div>
      <div className={styles.contractRows}>
        {parameters.map((parameter, index) => {
          const position = index + 1;
          const pathParameter = parameter.location === "path";
          return (
            <div
              key={parameter.id}
              className={styles.parameterRow}
              role="group"
              aria-label={`${content.parametersLabel} ${position}`}
            >
              <TextInput
                aria-label={`${content.parameterNameLabel} ${position}`}
                name={`parameter-${parameter.id}-name`}
                pattern="[A-Za-z][A-Za-z0-9_-]*"
                readOnly={pathParameter}
                required
                tone="nested"
                value={parameter.name}
                onChange={(event) => updateParameter(parameter.id, {
                  name: event.currentTarget.value,
                })}
              />
              <SelectMenu
                height="large"
                label={`${content.parameterLocationLabel} ${position}`}
                options={apiParameterLocations.map((location) => ({
                  id: location,
                  kind: "action",
                  label: content.parameterLocationOptions[location],
                  disabled: pathParameter
                    ? location !== "path"
                    : location === "path",
                  onSelect: () => updateParameter(parameter.id, {
                    location,
                    required: location === "path" ? true : parameter.required,
                  }),
                } satisfies SelectMenuOption))}
                rounded
                selectedId={parameter.location}
                width="field"
              />
              <SelectMenu
                height="large"
                label={`${content.parameterTypeLabel} ${position}`}
                options={apiParameterTypes.map((type) => ({
                  id: type,
                  kind: "action",
                  label: content.parameterTypeOptions[type],
                  onSelect: () => updateParameter(parameter.id, { type }),
                }))}
                rounded
                selectedId={parameter.type}
                width="field"
              />
              <TextInput
                aria-label={`${content.formatLabel} ${position}`}
                name={`parameter-${parameter.id}-format`}
                placeholder={content.formatLabel}
                tone="nested"
                value={parameter.format ?? ""}
                onChange={(event) => updateParameter(parameter.id, {
                  format: event.currentTarget.value,
                })}
              />
              <TextInput
                aria-label={`${content.parameterDescriptionLabel} ${position}`}
                name={`parameter-${parameter.id}-description`}
                placeholder={content.parameterDescriptionLabel}
                tone="nested"
                value={parameter.description ?? ""}
                onChange={(event) => updateParameter(parameter.id, {
                  description: event.currentTarget.value,
                })}
              />
              <div className={styles.parameterActions}>
                <CheckboxWithLabel
                  checked={pathParameter || parameter.required}
                  disabled={pathParameter}
                  label={content.requiredLabel}
                  onChange={(event) => updateParameter(parameter.id, {
                    required: event.currentTarget.checked,
                  })}
                />
                {pathParameter ? (
                  <span
                    aria-hidden="true"
                    className={styles.parameterActionSpacer}
                  />
                ) : (
                  <IconButton
                    aria-label={`${content.removeParameterLabel} ${position}`}
                    onClick={() => removeParameter(parameter.id)}
                  >
                    <CloseIcon />
                  </IconButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <span className={styles.label}>{content.securityBehaviorLabel}</span>
      <div className={styles.contractFieldGrid}>
        <SelectMenu
          height="large"
          label={content.securitySchemeLabel}
          options={apiSecuritySchemes.map((scheme) => ({
            id: scheme,
            kind: "action",
            label: content.securitySchemeOptions[scheme],
            onSelect: () => {
              setSecurityScheme(scheme);
              if (scheme === "cookie") setSecurityLocation("cookie");
            },
          }))}
          rounded
          selectedId={securityScheme}
          width="field"
        />
        {securityNeedsName ? (
          <LabeledInput
            hint={content.securityNameHint}
            label={content.authNameLabel}
            name="security-name"
            required
            value={securityName}
            onChange={(event) => setSecurityName(event.currentTarget.value)}
          />
        ) : null}
        {securityNeedsName ? (
          <SelectMenu
            height="large"
            label={content.authLocationLabel}
            options={(securityScheme === "cookie"
              ? (["cookie"] as const)
              : (["query", "header", "cookie"] as const)).map((location) => ({
              id: location,
              kind: "action",
              label: content.parameterLocationOptions[location],
              onSelect: () => setSecurityLocation(location),
            }))}
            rounded
            selectedId={securityLocation}
            width="field"
          />
        ) : null}
        {securityScheme === "oauth2" ? (
          <LabeledInput
            label={content.securityScopesLabel}
            name="security-scopes"
            value={securityScopes}
            onChange={(event) => setSecurityScopes(event.currentTarget.value)}
          />
        ) : null}
        <SelectMenu
          height="large"
          label={content.cacheLabel}
          options={apiCachePolicies.map((policy) => ({
            id: policy,
            kind: "action",
            label: content.cacheOptions[policy],
            onSelect: () => setCache(policy),
          }))}
          rounded
          selectedId={cache}
          width="field"
        />
        <SelectMenu
          height="large"
          label={content.idempotencyLabel}
          options={apiIdempotencyPolicies.map((policy) => ({
            id: policy,
            kind: "action",
            label: content.idempotencyOptions[policy],
            onSelect: () => setIdempotency(policy),
          }))}
          rounded
          selectedId={idempotency}
          width="field"
        />
        <LabeledInput
          label={content.rateLimitLabel}
          name="rate-limit"
          value={rateLimit}
          onChange={(event) => setRateLimit(event.currentTarget.value)}
        />
      </div>
    </div>
  );
});
