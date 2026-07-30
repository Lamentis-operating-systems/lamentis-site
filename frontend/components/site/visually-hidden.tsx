import type { AriaRole, ReactNode } from "react";
import styles from "./visually-hidden.module.css";

type VisuallyHiddenProps = {
  as?: "legend" | "span";
  children: ReactNode;
  id?: string;
  role?: AriaRole;
};

export function VisuallyHidden({
  as: Component = "span",
  children,
  id,
  role,
}: VisuallyHiddenProps) {
  return (
    <Component className={styles.content} id={id} role={role}>
      {children}
    </Component>
  );
}
