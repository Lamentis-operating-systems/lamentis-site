import { Fragment } from "react";
import { parseApiRoutePath } from "@/domain/site/api-route-path";
import styles from "./api-route-display.module.css";

type ApiRoutePathProps = {
  path: string;
};

export function ApiRoutePath({ path }: ApiRoutePathProps) {
  const segments = parseApiRoutePath(path)?.segments ?? [];

  return (
    <span className={styles.path}>
      <span className={styles.prefix}>/</span>
      <span className={styles.segments}>
        {segments.map((segment, index) => (
          <Fragment
            key={`${
              segment.kind === "literal" ? segment.value : segment.name
            }-${index}`}
          >
            {index > 0 ? (
              <span className={styles.separator}>/</span>
            ) : null}
            <span
              className={
                segment.kind === "parameter"
                  ? styles.parameter
                  : undefined
              }
            >
              {segment.kind === "parameter"
                ? `{${segment.name}}`
                : segment.value}
            </span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}
