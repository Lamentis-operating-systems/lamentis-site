import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";
import { InputSurface } from "./input-surface";
import styles from "./text-area.module.css";

type TextAreaProps = Omit<
  ComponentPropsWithoutRef<"textarea">,
  "className"
> & {
  className?: string;
  tone?: "default" | "nested";
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ className, tone = "default", ...props }, ref) {
    return (
      <InputSurface className={className} tone={tone}>
        <textarea {...props} ref={ref} className={styles.textarea} />
      </InputSurface>
    );
  },
);
