import type { ComponentProps, ReactNode } from "react";
import styles from "./icon-button.module.css";

type IconButtonProps = Omit<
  ComponentProps<"button">,
  "aria-label" | "children"
> & {
  "aria-label": string;
  children: ReactNode;
};

export function IconButton({
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`${styles.button} ${className ?? ""}`.trim()}
    />
  );
}
