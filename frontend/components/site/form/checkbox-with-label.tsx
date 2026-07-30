import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";
import { CheckIcon } from "../icons/check-icon";
import styles from "./checkbox-with-label.module.css";

type CheckboxWithLabelProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "children" | "className" | "type"
> & {
  className?: string;
  label: ReactNode;
};

export function CheckboxWithLabel({
  className,
  label,
  ...props
}: CheckboxWithLabelProps) {
  return (
    <label
      className={`${styles.root} ${className ?? ""}`.trim()}
    >
      <input {...props} className={styles.input} type="checkbox" />
      <span className={styles.indicator} aria-hidden="true">
        <CheckIcon />
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  );
}
