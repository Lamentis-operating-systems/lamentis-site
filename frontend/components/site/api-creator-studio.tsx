"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  hasApiResponseSchemaConflict,
  hasApiRouteIdentity,
  httpMethods,
  nextApiRouteId,
  type HttpMethod,
} from "@/domain/site/api-route";
import { parseApiRoutePath } from "@/domain/site/api-route-path";
import { apiRoutesStorage } from "@/domain/site/api-route-storage";
import type { ApiCreatorStudioContent } from "@/domain/site/content";
import {
  ApiRouteRow,
  type ApiRouteRowContent,
} from "./api-route-row";
import { BracedPathInput } from "./braced-path-input";
import textInputStyles from "./form/text-input.module.css";
import { CheckIcon } from "./icons/check-icon";
import { HttpMethodSelector } from "./http-method-selector";
import { useOverlay } from "./overlay/overlay-provider";
import { ResponseSchemaEditor } from "./response-schema-editor";
import { SearchSurface } from "./search-surface";
import { useLocalStorageState } from "./use-local-storage-state";
import styles from "./search-page.module.css";

const studioOverlaySize = "var(--overlay-size-large)";

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
  copyRouteErrorLabel,
  copyRouteLabel,
  deleteRouteLabel,
  duplicatePathError,
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
  saveRouteLabel,
  storageErrorLabel,
  label,
  placeholder,
}: ApiCreatorStudioContent) {
  const { closeOverlay, openOverlay } = useOverlay();
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [copyFailed, setCopyFailed] = useState(false);
  const [routes, setRoutes, storageStatus] = useLocalStorageState(
    apiRoutesStorage,
  );
  const responseFormId = useId();
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
    if (!focusRouteInputAfterMutation.current) return;

    focusRouteInputAfterMutation.current = false;
    routeInputRef.current?.focus();
  }, [routes]);

  function addRoute(path: string) {
    let createdRouteId: number | undefined;
    let routesAtCreation = routes;
    setRoutes((currentRoutes) => {
      routesAtCreation = currentRoutes;
      if (hasApiRouteIdentity(currentRoutes, { method, path })) {
        return currentRoutes;
      }

      createdRouteId = nextApiRouteId(currentRoutes);
      return [
        ...currentRoutes,
        { id: createdRouteId, method, path },
      ];
    });
    if (createdRouteId === undefined) return;
    const routeId = createdRouteId;
    const createdRoute = { id: routeId, method, path };
    const disabledMethods = httpMethods.filter((candidateMethod) => (
      candidateMethod !== method
      && routesAtCreation.some((route) => (
        route.path === path && route.method === candidateMethod
      ))
    ));

    openOverlay({
      body: (
        <ResponseSchemaEditor
          content={responseEditor}
          disabledRouteMethods={disabledMethods}
          existingResponseSchemas={routesAtCreation.flatMap((route) => (
            route.response ? [route.response] : []
          ))}
          formId={responseFormId}
          onCopyRoute={() => copyRoute(path)}
          onDeleteRoute={() => {
            deleteRoute(routeId);
            closeOverlay();
          }}
          onEditRoute={editRoute}
          onRouteMethodChange={(nextMethod) => {
            updateRouteMethod(routeId, nextMethod);
          }}
          onSave={(response) => {
            let didSave = false;
            setRoutes((currentRoutes) => {
              if (
                !currentRoutes.some((route) => route.id === routeId)
                || hasApiResponseSchemaConflict(
                  currentRoutes,
                  response,
                  routeId,
                )
              ) {
                return currentRoutes;
              }

              didSave = true;
              return currentRoutes.map((route) => (
                route.id === routeId ? { ...route, response } : route
              ));
            });
            if (!didSave) return false;

            closeOverlay();
            return true;
          }}
          route={createdRoute}
          routeContent={routeRowContent}
        />
      ),
      closeLabel: closeResponseOverlayLabel,
      height: studioOverlaySize,
      placement: "bottom-right",
      submitAction: {
        formId: responseFormId,
        icon: <CheckIcon />,
        label: responseEditor.saveLabel,
      },
      title: responseOverlayTitle,
      width: studioOverlaySize,
    });
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

  function editRoute() {
    openOverlay({
      closeLabel: closeEditRouteOverlayLabel,
      height: studioOverlaySize,
      placement: "bottom-right",
      submitAction: {
        icon: <CheckIcon />,
        label: saveRouteLabel,
        onAction: closeOverlay,
      },
      title: editRouteTitle,
      width: studioOverlaySize,
    });
  }

  const persistenceWarning = (
    storageStatus === "invalid"
    || storageStatus === "unavailable"
    || storageStatus === "volatile"
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
                    onEdit={editRoute}
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
      role="group"
      withMethod
    >
      <HttpMethodSelector
        label={methodSelectorLabel}
        onChange={setMethod}
        value={method}
      />
      <BracedPathInput
        actionLabel={actionLabel}
        className={textInputStyles.input}
        getValidationReason={(path) => {
          if (!parseApiRoutePath(path)) return "syntax";

          return hasApiRouteIdentity(routes, { method, path })
            ? "duplicate"
            : null;
        }}
        inputRef={routeInputRef}
        label={label}
        onAdd={addRoute}
        placeholder={placeholder}
        prefixHint={pathPrefixHint}
        validationMessages={{
          duplicate: duplicatePathError,
          syntax: invalidPathError,
        }}
      />
    </SearchSurface>
  );
}
