import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";
import { InputSurface } from "./input-surface";
import styles from "./text-input.module.css";

type TextInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "className" | "type"
> & {
  className?: string;
  tone?: "default" | "nested";
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({
    className,
    tone = "default",
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
      </InputSurface>
    );
  },
);
