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
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({
    className,
    type = "button",
    ...props
  }, ref) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={`${styles.button} ${className ?? ""}`.trim()}
      />
    );
  },
);
