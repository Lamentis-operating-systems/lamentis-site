"use client";

import { useEffect, useRef, type RefObject } from "react";

type ModalDialogOptions = {
  focusDialogOnOpen?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function useModalDialog(
  isOpen: boolean,
  {
    focusDialogOnOpen = false,
    returnFocusRef,
  }: ModalDialogOptions = {},
): RefObject<HTMLDialogElement | null> {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      previousFocusRef.current = returnFocusRef?.current
        ?? (
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null
        );
      dialog.showModal();
      if (focusDialogOnOpen) dialog.focus();
      return;
    }

    if (!isOpen) {
      if (dialog.open) dialog.close();
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [focusDialogOnOpen, isOpen, returnFocusRef]);

  useEffect(() => () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, []);

  return dialogRef;
}
