"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import primaryActionStyles from "../primary-action.module.css";
import { CloseIcon } from "./close-icon";
import styles from "./overlay-provider.module.css";

type OverlayPlacement = "bottom-right";
type OverlayDimension = number | string;
type OverlayActionIconPosition = "left" | "right";

type OverlayActionAppearance = {
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: OverlayActionIconPosition;
  label: string;
};

type OverlaySubmitAction = OverlayActionAppearance & (
  | {
      formId: string;
      onAction?: () => void;
    }
  | {
      formId?: never;
      onAction: () => void;
    }
);

type OverlayCancelAction = OverlayActionAppearance & {
  onAction?: () => void;
};

export type OverlayRequest = {
  body?: ReactNode;
  cancelAction?: OverlayCancelAction;
  closeLabel: string;
  height?: OverlayDimension;
  onDismiss?: () => void;
  placement?: OverlayPlacement;
  submitAction?: OverlaySubmitAction;
  title: string;
  width?: OverlayDimension;
};

type OverlayService = {
  closeOverlay: () => void;
  openOverlay: (request: OverlayRequest) => void;
};

type ActiveOverlay = {
  phase: "open" | "closing";
  request: OverlayRequest;
};

type BoundFormValidity = {
  formId: string;
  isValid: boolean;
};

type OverlayPanelStyle = CSSProperties & {
  "--overlay-height": string;
  "--overlay-width": string;
};

type OverlayHostProps = {
  closeOverlay: () => void;
  completeClose: () => void;
  overlay: ActiveOverlay | null;
};

const defaultOverlayWidth = "32rem";
const defaultOverlayHeight = "36rem";
const defaultOverlayPlacement: OverlayPlacement = "bottom-right";
const overlayExitFallbackMs = 300;
const enterPrioritySelector = [
  "a[href]",
  "button",
  "select",
  "textarea",
  "[data-overlay-enter-priority]",
  "[role='button']",
  "[role='combobox']",
  "[role='listbox']",
].join(",");
const OverlayContext = createContext<OverlayService | null>(null);

function toCssDimension(
  value: OverlayDimension | undefined,
  fallback: string,
) {
  if (typeof value === "number") return `${value}px`;
  return value ?? fallback;
}

function OverlayActionContent({
  action,
}: {
  action: OverlayActionAppearance;
}) {
  const icon = action.icon ? (
    <span className={styles.actionIcon}>{action.icon}</span>
  ) : null;

  return (
    <>
      {action.iconPosition !== "right" ? icon : null}
      <span>{action.label}</span>
      {action.iconPosition === "right" ? icon : null}
    </>
  );
}

function hasHigherPriorityEnterTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest(enterPrioritySelector) !== null;
}

function supportsConstraintValidation(
  element: Element,
): element is Element & {
  readonly validity: ValidityState;
  readonly willValidate: boolean;
} {
  return "validity" in element && "willValidate" in element;
}

function hasValidFormControls(form: HTMLFormElement): boolean {
  return Array.from(form.elements).every((element) => (
    !supportsConstraintValidation(element)
    || !element.willValidate
    || element.validity.valid
  ));
}

function OverlayHost({
  closeOverlay,
  completeClose,
  overlay,
}: OverlayHostProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [boundFormValidity, setBoundFormValidity] =
    useState<BoundFormValidity | null>(null);
  const titleId = useId();
  const request = overlay?.request ?? null;
  const submitFormId = request?.submitAction?.formId;
  const submitDisabled = Boolean(
    request?.submitAction?.disabled
    || (
      submitFormId
      && (
        boundFormValidity?.formId !== submitFormId
        || !boundFormValidity.isValid
      )
    ),
  );
  const showFooter = Boolean(
    request?.cancelAction || request?.submitAction,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (request && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      dialog.showModal();
      dialog.focus();
      return;
    }

    if (!request && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [request]);

  useEffect(() => {
    if (!submitFormId) return undefined;

    const form = document.getElementById(submitFormId);
    if (!(form instanceof HTMLFormElement)) return undefined;

    const activeForm = form;
    const activeFormId = submitFormId;
    let isActive = true;

    function updateValidity() {
      if (!isActive) return;

      const nextValidity = {
        formId: activeFormId,
        isValid: hasValidFormControls(activeForm),
      };
      setBoundFormValidity((currentValidity) => (
        currentValidity?.formId === nextValidity.formId
        && currentValidity?.isValid === nextValidity.isValid
          ? currentValidity
          : nextValidity
      ));
    }

    function updateAfterFormEvent() {
      queueMicrotask(updateValidity);
    }

    queueMicrotask(updateValidity);
    activeForm.addEventListener("change", updateAfterFormEvent);
    activeForm.addEventListener("input", updateAfterFormEvent);
    activeForm.addEventListener("reset", updateAfterFormEvent);

    const observer = new MutationObserver(updateValidity);
    observer.observe(activeForm, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      isActive = false;
      observer.disconnect();
      activeForm.removeEventListener("change", updateAfterFormEvent);
      activeForm.removeEventListener("input", updateAfterFormEvent);
      activeForm.removeEventListener("reset", updateAfterFormEvent);
    };
  }, [submitFormId]);

  useEffect(() => {
    if (overlay?.phase !== "closing") return undefined;

    const fallback = window.setTimeout(completeClose, overlayExitFallbackMs);
    return () => window.clearTimeout(fallback);
  }, [completeClose, overlay?.phase]);

  useEffect(() => () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, []);

  const panelStyle: OverlayPanelStyle = {
    "--overlay-height": toCssDimension(
      request?.height,
      defaultOverlayHeight,
    ),
    "--overlay-width": toCssDimension(
      request?.width,
      defaultOverlayWidth,
    ),
  };

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeOverlay();
  }

  function completeAnimatedClose(event: AnimationEvent<HTMLElement>) {
    if (
      event.target === event.currentTarget
      && overlay?.phase === "closing"
    ) {
      completeClose();
    }
  }

  function cancelFromButton() {
    try {
      request?.cancelAction?.onAction?.();
    } finally {
      closeOverlay();
    }
  }

  function submitOnEnter(event: KeyboardEvent<HTMLDialogElement>) {
    if (
      event.key !== "Enter"
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
      || event.defaultPrevented
      || event.nativeEvent.isComposing
      || overlay?.phase !== "open"
      || !request?.submitAction
      || submitDisabled
      || hasHigherPriorityEnterTarget(event.target)
    ) {
      return;
    }

    event.preventDefault();
    submitButtonRef.current?.click();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      tabIndex={-1}
      aria-labelledby={request ? titleId : undefined}
      data-placement={request?.placement ?? defaultOverlayPlacement}
      data-state={overlay?.phase}
      onCancel={(event) => {
        event.preventDefault();
        closeOverlay();
      }}
      onClose={completeClose}
      onClick={closeOnBackdrop}
      onKeyDown={submitOnEnter}
    >
      {request ? (
        <section
          className={styles.panel}
          style={panelStyle}
          onAnimationEnd={completeAnimatedClose}
        >
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {request.title}
            </h2>
            <button
              type="button"
              className={styles.closeButton}
              aria-label={request.closeLabel}
              onClick={closeOverlay}
            >
              <CloseIcon />
            </button>
          </header>

          <div className={styles.body}>{request.body}</div>
          {showFooter ? (
            <footer className={styles.footer}>
              {request.cancelAction ? (
                <button
                  type="button"
                  className={
                    `${primaryActionStyles.action} ${styles.secondaryAction}`
                  }
                  disabled={request.cancelAction.disabled}
                  onClick={cancelFromButton}
                >
                  <OverlayActionContent action={request.cancelAction} />
                </button>
              ) : null}
              {request.submitAction ? (
                <button
                  ref={submitButtonRef}
                  type={request.submitAction.formId ? "submit" : "button"}
                  form={request.submitAction.formId}
                  className={primaryActionStyles.action}
                  disabled={submitDisabled}
                  onClick={request.submitAction.onAction}
                >
                  <OverlayActionContent action={request.submitAction} />
                </button>
              ) : null}
            </footer>
          ) : null}
        </section>
      ) : null}
    </dialog>
  );
}

export function useOverlay() {
  const service = useContext(OverlayContext);

  if (!service) {
    throw new Error("useOverlay must be used within an OverlayProvider.");
  }

  return service;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<ActiveOverlay | null>(null);
  const activeOverlayRef = useRef<ActiveOverlay | null>(null);

  const openOverlay = useCallback((nextRequest: OverlayRequest) => {
    const nextOverlay: ActiveOverlay = {
      phase: "open",
      request: nextRequest,
    };
    activeOverlayRef.current = nextOverlay;
    setOverlay(nextOverlay);
  }, []);

  const closeOverlay = useCallback(() => {
    const activeOverlay = activeOverlayRef.current;
    if (!activeOverlay || activeOverlay.phase === "closing") return;

    const closingOverlay: ActiveOverlay = {
      ...activeOverlay,
      phase: "closing",
    };
    activeOverlayRef.current = closingOverlay;
    setOverlay(closingOverlay);
  }, []);

  const completeClose = useCallback(() => {
    const activeOverlay = activeOverlayRef.current;
    if (!activeOverlay || activeOverlay.phase !== "closing") return;

    activeOverlayRef.current = null;
    setOverlay(null);
    activeOverlay.request.onDismiss?.();
  }, []);

  const service = useMemo(
    () => ({ closeOverlay, openOverlay }),
    [closeOverlay, openOverlay],
  );

  return (
    <OverlayContext.Provider value={service}>
      {children}
      <OverlayHost
        closeOverlay={closeOverlay}
        completeClose={completeClose}
        overlay={overlay}
      />
    </OverlayContext.Provider>
  );
}
