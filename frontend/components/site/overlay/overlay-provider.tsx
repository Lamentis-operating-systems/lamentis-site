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
import { IconButton } from "../icon-button";
import primaryActionStyles from "../primary-action.module.css";
import { CloseIcon } from "../icons/close-icon";
import { useModalDialog } from "../use-modal-dialog";
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

type OverlayOwner = {
  id: number;
};

type ActiveOverlay = {
  owner: OverlayOwner;
  phase: "open" | "closing";
  request: OverlayRequest;
};

type BoundFormValidity = {
  formId: string;
  isValid: boolean;
  owner: OverlayOwner;
};

type OverlayPanelStyle = CSSProperties & {
  "--overlay-height": string;
  "--overlay-width": string;
};

type OverlayHostProps = {
  closeOverlay: (owner: OverlayOwner) => void;
  completeClose: (owner: OverlayOwner) => void;
  overlay: ActiveOverlay | null;
};

const defaultOverlayWidth = "var(--overlay-default-width)";
const defaultOverlayHeight = "var(--overlay-default-height)";
const defaultOverlayPlacement: OverlayPlacement = "bottom-right";
const animationFallbackSafetyMs = 50;
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

function parseCssTime(time: string | undefined): number {
  const normalizedTime = time?.trim();
  if (!normalizedTime) return 0;

  if (normalizedTime.endsWith("ms")) {
    return Number.parseFloat(normalizedTime) || 0;
  }

  if (normalizedTime.endsWith("s")) {
    return (Number.parseFloat(normalizedTime) || 0) * 1_000;
  }

  return 0;
}

function splitCssList(value: string): string[] {
  return value.split(",").map((item) => item.trim());
}

function getAnimationCompletionMs(element: HTMLElement): number {
  const computedStyle = window.getComputedStyle(element);
  const durations = splitCssList(computedStyle.animationDuration);
  const delays = splitCssList(computedStyle.animationDelay);
  const animationCount = Math.max(durations.length, delays.length);
  let longestAnimationMs = 0;

  for (let index = 0; index < animationCount; index += 1) {
    const durationMs = parseCssTime(durations[index % durations.length]);
    const delayMs = parseCssTime(delays[index % delays.length]);
    longestAnimationMs = Math.max(
      longestAnimationMs,
      Math.max(0, durationMs + delayMs),
    );
  }

  return longestAnimationMs + animationFallbackSafetyMs;
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
  const request = overlay?.request ?? null;
  const dialogRef = useModalDialog(Boolean(request), {
    focusDialogOnOpen: true,
  });
  const panelRef = useRef<HTMLElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [boundFormValidity, setBoundFormValidity] =
    useState<BoundFormValidity | null>(null);
  const titleId = useId();
  const overlayOwner = overlay?.owner;
  const submitFormId = request?.submitAction?.formId;
  const submitDisabled = Boolean(
    request?.submitAction?.disabled
    || (
      submitFormId
      && (
        boundFormValidity?.owner !== overlayOwner
        || boundFormValidity?.formId !== submitFormId
        || !boundFormValidity?.isValid
      )
    ),
  );
  const showFooter = Boolean(
    request?.cancelAction || request?.submitAction,
  );

  useEffect(() => {
    if (!submitFormId || !overlayOwner) return undefined;

    const form = document.getElementById(submitFormId);
    if (!(form instanceof HTMLFormElement)) return undefined;

    const activeForm = form;
    const activeFormId = submitFormId;
    const activeOwner = overlayOwner;
    let isActive = true;

    function updateValidity() {
      if (!isActive) return;

      const nextValidity = {
        formId: activeFormId,
        isValid: hasValidFormControls(activeForm),
        owner: activeOwner,
      };
      setBoundFormValidity((currentValidity) => (
        currentValidity?.owner === nextValidity.owner
        && currentValidity.formId === nextValidity.formId
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
  }, [overlayOwner, submitFormId]);

  useEffect(() => {
    if (overlay?.phase !== "closing") return undefined;

    const owner = overlay.owner;
    const fallback = window.setTimeout(
      () => completeClose(owner),
      panelRef.current
        ? getAnimationCompletionMs(panelRef.current)
        : animationFallbackSafetyMs,
    );
    return () => window.clearTimeout(fallback);
  }, [completeClose, overlay]);

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
    if (event.target === event.currentTarget && overlay) {
      closeOverlay(overlay.owner);
    }
  }

  function completeAnimatedClose(event: AnimationEvent<HTMLElement>) {
    if (
      event.target === event.currentTarget
      && overlay?.phase === "closing"
    ) {
      completeClose(overlay.owner);
    }
  }

  function cancelFromButton() {
    if (!overlay) return;

    const owner = overlay.owner;
    try {
      request?.cancelAction?.onAction?.();
    } finally {
      closeOverlay(owner);
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
        if (overlay) closeOverlay(overlay.owner);
      }}
      onClose={() => {
        if (overlay) completeClose(overlay.owner);
      }}
      onClick={closeOnBackdrop}
      onKeyDown={submitOnEnter}
    >
      {request ? (
        <section
          ref={panelRef}
          className={styles.panel}
          style={panelStyle}
          onAnimationEnd={completeAnimatedClose}
        >
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {request.title}
            </h2>
            <IconButton
              type="button"
              className={styles.closeButton}
              aria-label={request.closeLabel}
              onClick={() => {
                if (overlay) closeOverlay(overlay.owner);
              }}
            >
              <CloseIcon />
            </IconButton>
          </header>

          <div key={overlay?.owner.id} className={styles.body}>
            {request.body}
          </div>
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
  const dismissedOwnersRef = useRef(new WeakSet<OverlayOwner>());
  const nextOwnerIdRef = useRef(0);

  const dismissOverlay = useCallback((dismissedOverlay: ActiveOverlay) => {
    if (dismissedOwnersRef.current.has(dismissedOverlay.owner)) return;

    dismissedOwnersRef.current.add(dismissedOverlay.owner);
    dismissedOverlay.request.onDismiss?.();
  }, []);

  const openOverlay = useCallback((nextRequest: OverlayRequest) => {
    const replacedOverlay = activeOverlayRef.current;
    const owner: OverlayOwner = { id: nextOwnerIdRef.current };
    nextOwnerIdRef.current += 1;
    const nextOverlay: ActiveOverlay = {
      owner,
      phase: "open",
      request: nextRequest,
    };
    activeOverlayRef.current = nextOverlay;
    setOverlay(nextOverlay);

    if (replacedOverlay) dismissOverlay(replacedOverlay);
  }, [dismissOverlay]);

  const closeOwnedOverlay = useCallback((owner: OverlayOwner) => {
    const activeOverlay = activeOverlayRef.current;
    if (
      !activeOverlay
      || activeOverlay.owner !== owner
      || activeOverlay.phase === "closing"
    ) {
      return;
    }

    const closingOverlay: ActiveOverlay = {
      ...activeOverlay,
      phase: "closing",
    };
    activeOverlayRef.current = closingOverlay;
    setOverlay(closingOverlay);
  }, []);

  const closeOverlay = useCallback(() => {
    const activeOverlay = activeOverlayRef.current;
    if (activeOverlay) closeOwnedOverlay(activeOverlay.owner);
  }, [closeOwnedOverlay]);

  const completeClose = useCallback((owner: OverlayOwner) => {
    const activeOverlay = activeOverlayRef.current;
    if (
      !activeOverlay
      || activeOverlay.owner !== owner
    ) {
      return;
    }

    activeOverlayRef.current = null;
    setOverlay(null);
    dismissOverlay(activeOverlay);
  }, [dismissOverlay]);

  useEffect(() => () => {
    const activeOverlay = activeOverlayRef.current;
    activeOverlayRef.current = null;
    if (activeOverlay) dismissOverlay(activeOverlay);
  }, [dismissOverlay]);

  const service = useMemo(
    () => ({ closeOverlay, openOverlay }),
    [closeOverlay, openOverlay],
  );

  return (
    <OverlayContext.Provider value={service}>
      {children}
      <OverlayHost
        closeOverlay={closeOwnedOverlay}
        completeClose={completeClose}
        overlay={overlay}
      />
    </OverlayContext.Provider>
  );
}
