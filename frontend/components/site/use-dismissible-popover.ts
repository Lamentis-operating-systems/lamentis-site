"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type DismissiblePopoverPhase = "closed" | "closing" | "open";

const closeAnimationFallbackMs = 250;

export function useDismissiblePopover() {
  const [phase, setPhase] =
    useState<DismissiblePopoverPhase>("closed");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpen = phase === "open";

  const closePopover = useCallback((restoreFocus = false) => {
    setPhase((currentPhase) => (
      currentPhase === "open" ? "closing" : currentPhase
    ));
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const completeClose = useCallback(() => {
    setPhase((currentPhase) => (
      currentPhase === "closing" ? "closed" : currentPhase
    ));
  }, []);

  const togglePopover = useCallback(() => {
    setPhase((currentPhase) => (
      currentPhase === "open" ? "closing" : "open"
    ));
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

  useEffect(() => {
    if (phase !== "closing") return undefined;

    const fallback = window.setTimeout(
      completeClose,
      closeAnimationFallbackMs,
    );
    return () => window.clearTimeout(fallback);
  }, [completeClose, phase]);

  return {
    closePopover,
    completeClose,
    isOpen,
    isPresent: phase !== "closed",
    phase,
    rootRef,
    togglePopover,
    triggerRef,
  };
}
