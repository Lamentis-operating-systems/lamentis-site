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
  resize?: "none" | "vertical";
  tone?: "default" | "nested";
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({
    className,
    resize = "vertical",
    tone = "default",
    ...props
  }, ref) {
    return (
      <InputSurface
        className={[styles.surface, className ?? ""].filter(Boolean).join(" ")}
        tone={tone}
      >
        <textarea
          {...props}
          ref={ref}
          className={[
            styles.textarea,
            resize === "none" ? styles.textareaFixed : "",
          ].filter(Boolean).join(" ")}
        />
      </InputSurface>
    );
  },
);
