import {
  forwardRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import styles from "./icon-button.module.css";

type IconButtonProps = Omit<
  ComponentProps<"button">,
  "aria-label" | "children"
> & {
  "aria-label": string;
  children: ReactNode;
  variant?: "default" | "transparent";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({
    className,
    type = "button",
    variant = "default",
    ...props
  }, ref) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        data-variant={variant}
        className={`${styles.button} ${className ?? ""}`.trim()}
      />
    );
  },
);
