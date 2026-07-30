import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { InputSurface } from "./input-surface";
import styles from "./text-input.module.css";

type TextInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "className" | "type"
> & {
  className?: string;
  tone?: "default" | "nested";
  trailingControl?: ReactNode;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({
    className,
    tone = "default",
    trailingControl,
    ...props
  }, ref) {
    return (
      <InputSurface className={className} tone={tone}>
        <input
          {...props}
          ref={ref}
          className={styles.input}
          type="text"
        />
        {trailingControl}
      </InputSurface>
    );
  },
);
