"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  apiSecuritySchemes,
  apiRouteSchemas,
  hasApiRouteIdentity,
  httpMethods,
  nextApiRouteId,
  type ApiRouteContract,
  type HttpMethod,
} from "@/domain/site/api-route";
import { apiContractMetadataStorage } from "@/domain/site/api-contract-metadata-storage";
import { apiRoutesStorage } from "@/domain/site/api-route-storage";
import {
  apiRouteWorkspaceValidationReason,
  disabledApiRouteMethods,
  transitionApiRouteWorkspaceSave,
} from "@/domain/site/api-route-workspace";
import type { ApiCreatorStudioContent } from "@/domain/site/content";
import {
  ApiRouteRow,
  type ApiRouteRowContent,
} from "./api-route-row";
import { ApiRouteInputBar } from "./api-route-input-bar";
import { CheckIcon } from "./icons/check-icon";
import { ChevronIcon } from "./icons/chevron-icon";
import { TextInput } from "./form/text-input";
import { SelectMenu } from "./select-menu";
import { useOverlay } from "./overlay/overlay-provider";
import { ResponseSchemaEditor } from "./response-schema-editor";
import { SearchSurface } from "./search-surface";
import { useLocalStorageState } from "./use-local-storage-state";
import styles from "./api-creator-studio.module.css";

const studioOverlaySize = "var(--overlay-size-large)";
const studioOverlayResize = {
  minHeight: 320,
  minWidth: 360,
} as const;

function copyRouteFallback(path: string) {
  const activeElement = document.activeElement;
  const copyField = document.createElement("textarea");

  try {
    copyField.value = path;
    copyField.setAttribute("readonly", "");
    copyField.style.position = "fixed";
    copyField.style.opacity = "0";
    document.body.append(copyField);
    copyField.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    copyField.remove();
    if (activeElement instanceof HTMLElement) activeElement.focus();
  }
}

async function writeRouteToClipboard(path: string) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard API unavailable.");
    await navigator.clipboard.writeText(path);
    return true;
  } catch {
    return copyRouteFallback(path);
  }
}

export function ApiCreatorStudio({
  actionLabel,
  closeEditRouteOverlayLabel,
  closeResponseOverlayLabel,
  contractMetadata,
  copyRouteErrorLabel,
  copyRouteLabel,
  deleteRouteLabel,
  duplicatePathError,
  editResponseTypeDescription,
  editRouteLabel,
  editRouteTitle,
  heading,
  invalidPathError,
  methodSelectorLabel,
  pathPrefixHint,
  responseEditor,
  responseOverlayTitle,
  routeActionsLabel,
  routeListLabel,
  storageErrorLabel,
  label,
  placeholder,
}: ApiCreatorStudioContent) {
  const { closeOverlay, openOverlay } = useOverlay();
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [copyFailed, setCopyFailed] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [metadata, setMetadata, metadataStorageStatus] =
    useLocalStorageState(apiContractMetadataStorage);
  const [
    routes,
    setRoutes,
    storageStatus,
    transactRoutes,
  ] = useLocalStorageState(apiRoutesStorage);
  const routesRef = useRef(routes);
  const responseFormId = useId();
  const metadataHeadingId = useId();
  const metadataPanelId = useId();
  const routeInputRef = useRef<HTMLInputElement>(null);
  const focusRouteInputAfterMutation = useRef(false);
  const methodsByPath = useMemo(() => {
    const index = new Map<string, Set<HttpMethod>>();

    for (const route of routes) {
      const methods = index.get(route.path) ?? new Set<HttpMethod>();
      methods.add(route.method);
      index.set(route.path, methods);
    }

    return index;
  }, [routes]);
  const routeRowContent: ApiRouteRowContent = {
    copyLabel: copyRouteLabel,
    deleteLabel: deleteRouteLabel,
    editLabel: editRouteLabel,
    methodSelectorLabel,
    responseTypeLabel: responseEditor.responseTypeLabel,
    routeActionsLabel,
    routeLabel: responseEditor.routeLabel,
  };

  useLayoutEffect(() => {
    routesRef.current = routes;

    if (!focusRouteInputAfterMutation.current) return;

    focusRouteInputAfterMutation.current = false;
    routeInputRef.current?.focus();
  }, [routes]);

  function openResponseEditor(
    route: ApiRouteContract,
    mode: "create" | "edit",
    routeSnapshot: readonly ApiRouteContract[],
  ) {
    const disabledMethods = disabledApiRouteMethods(routeSnapshot, route);
    const editorContent = mode === "edit"
      ? {
          ...responseEditor,
          responseTypeDescription: editResponseTypeDescription,
          typeDescriptionByKind: {
            ...responseEditor.typeDescriptionByKind,
            response: editResponseTypeDescription,
          },
        }
      : responseEditor;

    openOverlay({
      body: (
        <ResponseSchemaEditor
          content={editorContent}
          disabledRouteMethods={disabledMethods}
          existingSchemas={routeSnapshot.flatMap(
            (candidateRoute) => (
              candidateRoute.id !== route.id
                ? apiRouteSchemas(candidateRoute)
                : []
            ),
          )}
          formId={responseFormId}
          getRouteValidationReason={(nextMethod, nextPath) => (
            apiRouteWorkspaceValidationReason(
              routesRef.current,
              { method: nextMethod, path: nextPath },
              route.id,
            )
          )}
          {...(mode === "create"
            ? {
                onRouteMethodChange: (nextMethod: HttpMethod) => {
                  updateRouteMethod(route.id, nextMethod);
                },
              }
            : {})}
          onSave={(contract, nextRoute) => {
            const { result } = transactRoutes((currentRoutes) => {
              const transition = transitionApiRouteWorkspaceSave(
                currentRoutes,
                {
                  ...contract,
                  route: nextRoute,
                  routeId: route.id,
                },
              );
              return {
                result: transition.result,
                value: transition.routes,
              };
            });

            if (result === "saved" || result === "route-missing") {
              closeOverlay();
            }
            return result;
          }}
          route={route}
          routeInputContent={{
            duplicatePathError,
            invalidPathError,
            label,
            methodSelectorLabel,
            pathPrefixHint,
            placeholder,
          }}
        />
      ),
      closeLabel: mode === "edit"
        ? closeEditRouteOverlayLabel
        : closeResponseOverlayLabel,
      height: studioOverlaySize,
      initialFocus: "first-form-control",
      placement: "bottom-right",
      resizable: studioOverlayResize,
      submitAction: {
        formId: responseFormId,
        icon: <CheckIcon />,
        label: responseEditor.saveLabel,
      },
      title: mode === "edit" ? editRouteTitle : responseOverlayTitle,
      width: studioOverlaySize,
    });
  }

  function addRoute(path: string) {
    const { result } = transactRoutes((currentRoutes) => {
      if (hasApiRouteIdentity(currentRoutes, { method, path })) {
        return { result: null, value: currentRoutes };
      }

      const createdRoute = {
        id: nextApiRouteId(currentRoutes),
        method,
        path,
      };
      const nextRoutes = [
        ...currentRoutes,
        createdRoute,
      ];
      return {
        result: { createdRoute, routes: nextRoutes },
        value: nextRoutes,
      };
    });
    if (!result) return;

    openResponseEditor(
      result.createdRoute,
      "create",
      result.routes,
    );
  }

  function updateRouteMethod(routeId: number, nextMethod: HttpMethod) {
    setRoutes((currentRoutes) => {
      const route = currentRoutes.find((candidate) => (
        candidate.id === routeId
      ));
      if (
        !route
        || hasApiRouteIdentity(
          currentRoutes,
          { method: nextMethod, path: route.path },
          routeId,
        )
      ) {
        return currentRoutes;
      }

      return currentRoutes.map((candidate) => (
        candidate.id === routeId
          ? { ...candidate, method: nextMethod }
          : candidate
      ));
    });
  }

  function deleteRoute(routeId: number) {
    focusRouteInputAfterMutation.current = true;
    setRoutes((currentRoutes) => (
      currentRoutes.filter((route) => route.id !== routeId)
    ));
  }

  function copyRoute(path: string) {
    void writeRouteToClipboard(path).then((copied) => {
      setCopyFailed(!copied);
    });
  }

  function editRoute(routeId: number) {
    const routeSnapshot = routesRef.current;
    const route = routeSnapshot.find((candidateRoute) => (
      candidateRoute.id === routeId
    ));
    if (!route) return;

    openResponseEditor(route, "edit", routeSnapshot);
  }

  const persistenceWarning = (
    storageStatus === "invalid"
    || storageStatus === "unavailable"
    || storageStatus === "volatile"
    || metadataStorageStatus === "invalid"
    || metadataStorageStatus === "unavailable"
    || metadataStorageStatus === "volatile"
  ) ? (
    <p className={styles.persistenceWarning} role="status">
      {storageErrorLabel}
    </p>
  ) : null;

  const routeList = (
    <>
      {routes.length > 0 ? (
        <div className={styles.routeTable}>
          <ul className={styles.routeList} aria-label={routeListLabel}>
            {routes.map((route) => {
              const methodsForPath = methodsByPath.get(route.path);
              const disabledMethods = httpMethods.filter((candidateMethod) => (
                candidateMethod !== route.method
                && methodsForPath?.has(candidateMethod)
              ));

              return (
                <li key={route.id}>
                  <ApiRouteRow
                    content={routeRowContent}
                    disabledMethods={disabledMethods}
                    onCopy={() => copyRoute(route.path)}
                    onDelete={() => deleteRoute(route.id)}
                    onEdit={() => editRoute(route.id)}
                    onMethodChange={(nextMethod) => {
                      updateRouteMethod(route.id, nextMethod);
                    }}
                    route={route}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {persistenceWarning}
      {copyFailed ? (
        <p className={styles.persistenceWarning} role="status">
          {copyRouteErrorLabel}
        </p>
      ) : null}
    </>
  );

  return (
    <SearchSurface
      contentAfter={routeList}
      heading={heading}
      label={label}
      surface={(
        <div className={styles.studioControls}>
          <section className={styles.metadataSection} aria-labelledby={metadataHeadingId}>
            <button
              type="button"
              className={styles.metadataToggle}
              aria-controls={metadataPanelId}
              aria-expanded={metadataOpen}
              onClick={() => setMetadataOpen((current) => !current)}
            >
              <span>
                <span id={metadataHeadingId} className={styles.metadataTitle}>
                  {contractMetadata.label}
                </span>
                <span className={styles.metadataDescription}>
                  {contractMetadata.description}
                </span>
              </span>
              <ChevronIcon />
            </button>
            <div
              id={metadataPanelId}
              className={styles.metadataFields}
              hidden={!metadataOpen}
            >
              <TextInput
                aria-label={contractMetadata.titleLabel}
                placeholder={contractMetadata.titleLabel}
                tone="nested"
                value={metadata.title ?? ""}
                onChange={(event) => setMetadata((current) => ({
                  ...current,
                  title: event.currentTarget.value || undefined,
                }))}
              />
              <TextInput
                aria-label={contractMetadata.versionLabel}
                placeholder={contractMetadata.versionLabel}
                tone="nested"
                value={metadata.version ?? ""}
                onChange={(event) => setMetadata((current) => ({
                  ...current,
                  version: event.currentTarget.value || undefined,
                }))}
              />
              <TextInput
                aria-label={contractMetadata.basePathLabel}
                pattern="/.*"
                placeholder="/api/v1"
                tone="nested"
                value={metadata.basePath ?? ""}
                onChange={(event) => setMetadata((current) => ({
                  ...current,
                  basePath: event.currentTarget.value || undefined,
                }))}
              />
              <SelectMenu
                height="large"
                label={responseEditor.routeContract.securitySchemeLabel}
                options={apiSecuritySchemes.map((scheme) => ({
                  id: scheme,
                  kind: "action" as const,
                  label: responseEditor.routeContract.securitySchemeOptions[scheme],
                  onSelect: () => setMetadata((current) => ({
                    ...current,
                    security: scheme === "none" ? undefined : {
                      scheme,
                      ...(scheme === "apiKey"
                        ? { location: "header" as const, name: "X-API-Key" }
                        : {}),
                      ...(scheme === "cookie"
                        ? { location: "cookie" as const, name: "session" }
                        : {}),
                    },
                  })),
                }))}
                rounded
                selectedId={metadata.security?.scheme ?? "none"}
                width="field"
              />
              {metadata.security?.scheme === "apiKey"
                || metadata.security?.scheme === "cookie" ? (
                  <TextInput
                    aria-label={responseEditor.routeContract.authNameLabel}
                    placeholder={responseEditor.routeContract.securityNameHint}
                    required
                    tone="nested"
                    value={metadata.security.name ?? ""}
                    onChange={(event) => setMetadata((current) => ({
                      ...current,
                      security: current.security
                        ? { ...current.security, name: event.currentTarget.value }
                        : undefined,
                    }))}
                  />
                ) : null}
              {metadata.security?.scheme === "apiKey" ? (
                <SelectMenu
                  height="large"
                  label={responseEditor.routeContract.authLocationLabel}
                  options={(["query", "header", "cookie"] as const).map((location) => ({
                    id: location,
                    kind: "action" as const,
                    label: responseEditor.routeContract.parameterLocationOptions[location],
                    onSelect: () => setMetadata((current) => ({
                      ...current,
                      security: current.security?.scheme === "apiKey"
                        ? { ...current.security, location }
                        : current.security,
                    })),
                  }))}
                  rounded
                  selectedId={metadata.security.location ?? "header"}
                  width="field"
                />
              ) : null}
              {metadata.security?.scheme === "oauth2" ? (
                <TextInput
                  aria-label={responseEditor.routeContract.securityScopesLabel}
                  placeholder={responseEditor.routeContract.securityScopesLabel}
                  tone="nested"
                  value={(metadata.security.scopes ?? []).join(", ")}
                  onChange={(event) => setMetadata((current) => ({
                    ...current,
                    security: current.security ? {
                      ...current.security,
                      scopes: event.currentTarget.value
                        .split(",")
                        .map((scope) => scope.trim())
                        .filter(Boolean),
                    } : undefined,
                  }))}
                />
              ) : null}
            </div>
          </section>
          <ApiRouteInputBar
            actionLabel={actionLabel}
            getValidationReason={(candidateMethod, path) => (
              apiRouteWorkspaceValidationReason(
                routes,
                { method: candidateMethod, path },
              )
            )}
            inputRef={routeInputRef}
            label={label}
            method={method}
            methodSelectorLabel={methodSelectorLabel}
            onAdd={addRoute}
            onMethodChange={setMethod}
            placeholder={placeholder}
            prefixHint={pathPrefixHint}
            validationMessages={{
              duplicate: duplicatePathError,
              syntax: invalidPathError,
            }}
          />
        </div>
      )}
    />
  );
}
