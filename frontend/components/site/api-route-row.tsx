"use client";

import type {
  ApiRouteContract,
  HttpMethod,
} from "@/domain/site/api-route";
import { ApiRoutePath } from "./api-route-display";
import { HttpMethodSelector } from "./http-method-selector";
import { RouteActionsMenu } from "./route-actions-menu";
import { VisuallyHidden } from "./visually-hidden";
import styles from "./api-route-row.module.css";

export type ApiRouteRowContent = {
  copyLabel: string;
  deleteLabel: string;
  editLabel: string;
  methodSelectorLabel: string;
  responseTypeLabel: string;
  routeActionsLabel: string;
  routeLabel: string;
};

type ApiRouteRowProps = {
  className?: string;
  content: ApiRouteRowContent;
  disabledMethods?: readonly HttpMethod[];
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMethodChange: (method: HttpMethod) => void;
  route: ApiRouteContract;
};

export function ApiRouteRow({
  className,
  content,
  disabledMethods = [],
  onCopy,
  onDelete,
  onEdit,
  onMethodChange,
  route,
}: ApiRouteRowProps) {
  return (
    <div
      className={`${styles.row} ${className ?? ""}`.trim()}
      role="group"
      aria-label={`${content.routeLabel}: ${route.method} ${route.path}`}
    >
      <div className={styles.method}>
        <HttpMethodSelector
          disabledMethods={disabledMethods}
          label={`${content.methodSelectorLabel} ${route.path}`}
          onChange={onMethodChange}
          value={route.method}
        />
      </div>
      <ApiRoutePath path={route.path} />
      <RouteActionsMenu
        copyLabel={content.copyLabel}
        deleteLabel={content.deleteLabel}
        editLabel={content.editLabel}
        label={`${content.routeActionsLabel} ${route.path}`}
        onCopy={onCopy}
        onDelete={onDelete}
        onEdit={onEdit}
        path={route.path}
      />
      {route.response ? (
        <VisuallyHidden>
          {content.responseTypeLabel}: {route.response.typeName}
        </VisuallyHidden>
      ) : null}
    </div>
  );
}
