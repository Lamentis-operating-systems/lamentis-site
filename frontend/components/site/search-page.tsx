"use client";

import { Fragment, useId, useState } from "react";
import {
  nextApiRouteId,
  type HttpMethod,
} from "@/domain/site/api-route";
import { apiRoutesStorage } from "@/domain/site/api-route-storage";
import type { ResponseSchemaEditorContent } from "@/domain/site/content";
import { BracedPathInput } from "./braced-path-input";
import { CheckIcon } from "./check-icon";
import layoutStyles from "./layout/site-layout.module.css";
import { HttpMethodSelector } from "./http-method-selector";
import { SearchIcon } from "./search-icon";
import { useOverlay } from "./overlay/overlay-provider";
import { ResponseSchemaEditor } from "./response-schema-editor";
import { RouteActionsMenu } from "./route-actions-menu";
import { useLocalStorageState } from "./use-local-storage-state";
import styles from "./search-page.module.css";

type SearchPageProps = {
  actionLabel?: string;
  closeEditRouteOverlayLabel?: string;
  closeResponseOverlayLabel?: string;
  copyRouteLabel?: string;
  deleteRouteLabel?: string;
  editRouteLabel?: string;
  editRouteTitle?: string;
  heading: string;
  highlightBracedInput?: boolean;
  methodSelectorLabel?: string;
  responseEditor?: ResponseSchemaEditorContent;
  responseOverlayTitle?: string;
  routeActionsLabel?: string;
  routeListLabel?: string;
  saveRouteLabel?: string;
  label: string;
  placeholder: string;
};

function RoutePath({ path }: { path: string }) {
  const segments = path.slice(1).split("/");

  return (
    <span className={styles.routePath}>
      <span className={styles.routePrefix}>/</span>
      <span className={styles.routeSegments}>
        {segments.map((segment, index) => (
          <Fragment key={`${segment}-${index}`}>
            {index > 0 ? (
              <span className={styles.routeSeparator}>/</span>
            ) : null}
            <span
              className={
                segment.startsWith("{") && segment.endsWith("}")
                  ? styles.routeParameter
                  : undefined
              }
            >
              {segment}
            </span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}

function copyRouteFallback(path: string) {
  const activeElement = document.activeElement;
  const copyField = document.createElement("textarea");
  copyField.value = path;
  copyField.setAttribute("readonly", "");
  copyField.style.position = "fixed";
  copyField.style.opacity = "0";
  document.body.append(copyField);
  copyField.select();
  document.execCommand("copy");
  copyField.remove();

  if (activeElement instanceof HTMLElement) activeElement.focus();
}

async function writeRouteToClipboard(path: string) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard API unavailable.");
    await navigator.clipboard.writeText(path);
  } catch {
    copyRouteFallback(path);
  }
}

export function SearchPage({
  actionLabel,
  closeEditRouteOverlayLabel,
  closeResponseOverlayLabel,
  copyRouteLabel,
  deleteRouteLabel,
  editRouteLabel,
  editRouteTitle,
  heading,
  highlightBracedInput,
  methodSelectorLabel,
  responseEditor,
  responseOverlayTitle,
  routeActionsLabel,
  routeListLabel,
  saveRouteLabel,
  label,
  placeholder,
}: SearchPageProps) {
  const { closeOverlay, openOverlay } = useOverlay();
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [routes, setRoutes] = useLocalStorageState(
    apiRoutesStorage,
  );
  const responseFormId = useId();

  if (
    highlightBracedInput
    && (
      !actionLabel
      || !closeEditRouteOverlayLabel
      || !closeResponseOverlayLabel
      || !copyRouteLabel
      || !deleteRouteLabel
      || !editRouteLabel
      || !editRouteTitle
      || !responseEditor
      || !responseOverlayTitle
      || !routeActionsLabel
      || !routeListLabel
      || !saveRouteLabel
    )
  ) {
    throw new Error(
      "A highlighted route input requires route actions, overlays, and route-list labels.",
    );
  }

  function addRoute(path: string) {
    const routeId = nextApiRouteId(routes);
    setRoutes((currentRoutes) => [
      ...currentRoutes,
      { id: routeId, method, path },
    ]);
    openOverlay({
      body: (
        <ResponseSchemaEditor
          content={responseEditor!}
          formId={responseFormId}
          onSave={(response) => {
            setRoutes((currentRoutes) => currentRoutes.map((route) => (
              route.id === routeId ? { ...route, response } : route
            )));
            closeOverlay();
          }}
        />
      ),
      closeLabel: closeResponseOverlayLabel!,
      height: "40rem",
      placement: "bottom-right",
      submitAction: {
        formId: responseFormId,
        icon: <CheckIcon />,
        label: responseEditor!.saveLabel,
      },
      title: responseOverlayTitle!,
      width: "40rem",
    });
  }

  function updateRouteMethod(routeId: number, nextMethod: HttpMethod) {
    setRoutes((currentRoutes) => currentRoutes.map((route) => (
      route.id === routeId ? { ...route, method: nextMethod } : route
    )));
  }

  function copyRoute(path: string) {
    void writeRouteToClipboard(path);
  }

  function deleteRoute(routeId: number) {
    setRoutes((currentRoutes) => (
      currentRoutes.filter((route) => route.id !== routeId)
    ));
  }

  function editRoute() {
    openOverlay({
      closeLabel: closeEditRouteOverlayLabel!,
      height: "40rem",
      placement: "bottom-right",
      submitAction: {
        icon: <CheckIcon />,
        label: saveRouteLabel!,
        onAction: closeOverlay,
      },
      title: editRouteTitle!,
      width: "40rem",
    });
  }

  return (
    <main className={`${layoutStyles.main} ${styles.page}`} aria-label={label}>
      <div className={styles.content}>
        <h1 className={styles.heading}>{heading}</h1>
        <div className={styles.formArea}>
          <div
            className={`${styles.search} ${
              methodSelectorLabel ? styles.searchWithMethod : ""
            }`}
            role="search"
            aria-label={label}
          >
            {methodSelectorLabel
              ? (
                  <HttpMethodSelector
                    label={methodSelectorLabel}
                    onChange={setMethod}
                    value={method}
                  />
                )
              : <SearchIcon />}
            {highlightBracedInput && actionLabel
              ? (
                  <BracedPathInput
                    actionLabel={actionLabel}
                    className={styles.input}
                    label={label}
                    onAdd={addRoute}
                    placeholder={placeholder}
                  />
                )
              : (
                  <input
                    className={styles.input}
                    type="search"
                    name="query"
                    aria-label={label}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                  />
                )}
          </div>

          {routes.length > 0
            && routeListLabel ? (
              <div className={styles.routeTable}>
                <ul className={styles.routeList} aria-label={routeListLabel}>
                  {routes.map((route) => (
                    <li
                      key={route.id}
                      className={styles.routeItem}
                    >
                      <HttpMethodSelector
                        label={`${methodSelectorLabel} ${route.path}`}
                        onChange={(nextMethod) => {
                          updateRouteMethod(route.id, nextMethod);
                        }}
                        value={route.method}
                      />
                      <RoutePath path={route.path} />
                      <RouteActionsMenu
                        copyLabel={copyRouteLabel!}
                        deleteLabel={deleteRouteLabel!}
                        editLabel={editRouteLabel!}
                        label={`${routeActionsLabel} ${route.path}`}
                        onCopy={() => copyRoute(route.path)}
                        onDelete={() => deleteRoute(route.id)}
                        onEdit={editRoute}
                        path={route.path}
                      />
                      {route.response && responseEditor ? (
                        <span className={styles.visuallyHidden}>
                          {responseEditor.responseTypeLabel}:{" "}
                          {route.response.typeName}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
        </div>
      </div>
    </main>
  );
}
