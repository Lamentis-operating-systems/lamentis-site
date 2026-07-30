"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export function useDismissiblePopover() {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closePopover = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeOnPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePopover();
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closePopover(true);
    }

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closePopover, isOpen]);

  return {
    closePopover,
    isOpen,
    rootRef,
    togglePopover: () => setIsOpen((open) => !open),
    triggerRef,
  };
}
