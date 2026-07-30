import type { ComponentProps } from "react";
import styles from "./input-surface.module.css";

type InputSurfaceProps = ComponentProps<"div"> & {
  tone?: "default" | "nested";
  withLeadingControl?: boolean;
};

export function InputSurface({
  className,
  tone = "default",
  withLeadingControl = false,
  ...props
}: InputSurfaceProps) {
  return (
    <div
      {...props}
      className={[
        styles.surface,
        tone === "nested" ? styles.surfaceNested : "",
        withLeadingControl ? styles.surfaceWithLeadingControl : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
    />
  );
}
