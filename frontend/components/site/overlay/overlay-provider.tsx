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
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { IconButton } from "../icon-button";
import primaryActionStyles from "../primary-action.module.css";
import { CloseIcon } from "../icons/close-icon";
import { useModalDialog } from "../use-modal-dialog";
import styles from "./overlay-provider.module.css";
import {
  fitOverlayRectToBounds,
  resizeOverlayRect,
  type OverlayBounds,
  type OverlayRect,
  type OverlayResizeDirection,
  type OverlayResizeLimits,
} from "./overlay-resize";

type OverlayPlacement = "bottom-right";
type OverlayDimension = number | string;
type OverlayActionIconPosition = "left" | "right";
type OverlayInitialFocus = "dialog" | "first-form-control";

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
  initialFocus?: OverlayInitialFocus;
  onDismiss?: () => void;
  placement?: OverlayPlacement;
  resizable?: OverlayResizeOptions;
  submitAction?: OverlaySubmitAction;
  title: string;
  width?: OverlayDimension;
};

type OverlayResizeOptions = OverlayResizeLimits;

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
  "--overlay-left"?: string;
  "--overlay-top"?: string;
  "--overlay-width": string;
};

type OverlayResizeSession = {
  bounds: OverlayBounds;
  direction: OverlayResizeDirection;
  handle: HTMLElement;
  lastRect: OverlayRect;
  owner: OverlayOwner;
  pointerId: number;
  previousCursor: string;
  previousUserSelect: string;
  startClientX: number;
  startClientY: number;
  startRect: OverlayRect;
};

type PositionedOverlayRect = {
  owner: OverlayOwner;
  rect: OverlayRect;
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
const finePointerQuery = "(hover: hover) and (pointer: fine)";
const overlayResizeDirections = [
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw",
] as const satisfies readonly OverlayResizeDirection[];
const overlayResizeHandleClasses: Record<
  OverlayResizeDirection,
  string
> = {
  e: styles.resizeEast,
  n: styles.resizeNorth,
  ne: styles.resizeNorthEast,
  nw: styles.resizeNorthWest,
  s: styles.resizeSouth,
  se: styles.resizeSouthEast,
  sw: styles.resizeSouthWest,
  w: styles.resizeWest,
};
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

function parsePixelValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOverlayBounds(dialog: HTMLDialogElement): OverlayBounds {
  const rect = dialog.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(dialog);

  return {
    bottom: rect.bottom - parsePixelValue(computedStyle.paddingBottom),
    left: rect.left + parsePixelValue(computedStyle.paddingLeft),
    right: rect.right - parsePixelValue(computedStyle.paddingRight),
    top: rect.top + parsePixelValue(computedStyle.paddingTop),
  };
}

function canUseOverlayResize() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(finePointerQuery).matches;
}

function applyResizeDocumentStyles(cursor: string) {
  const previousStyles = {
    cursor: document.body.style.cursor,
    userSelect: document.body.style.userSelect,
  };
  document.body.style.cursor = cursor;
  document.body.style.userSelect = "none";
  return previousStyles;
}

function restoreResizeDocumentStyles({
  cursor,
  userSelect,
}: {
  cursor: string;
  userSelect: string;
}) {
  document.body.style.cursor = cursor;
  document.body.style.userSelect = userSelect;
}

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
    focusDialogOnOpen: request?.initialFocus !== "first-form-control",
  });
  const panelRef = useRef<HTMLElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const preferredPanelRectRef = useRef<PositionedOverlayRect | null>(null);
  const resizeSessionRef = useRef<OverlayResizeSession | null>(null);
  const [positionedPanelRect, setPositionedPanelRect] =
    useState<PositionedOverlayRect | null>(null);
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
  const activePanelRect = (
    positionedPanelRect
    && positionedPanelRect.owner === overlayOwner
      ? positionedPanelRect.rect
      : null
  );
  const resizeEnabled = Boolean(
    request?.resizable && canUseOverlayResize(),
  );

  useEffect(() => {
    if (
      request?.initialFocus !== "first-form-control"
      || overlay?.phase !== "open"
    ) {
      return;
    }

    const firstFormControl = (
      dialogRef.current?.querySelector<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("[data-overlay-initial-focus]")
      ?? dialogRef.current?.querySelector<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      )
    );
    firstFormControl?.focus();
  }, [
    dialogRef,
    overlay?.owner,
    overlay?.phase,
    request?.initialFocus,
  ]);

  const finishResize = useCallback((
    outcome: "commit" | "discard" | "revert",
  ) => {
    const session = resizeSessionRef.current;
    if (!session) return;

    resizeSessionRef.current = null;
    try {
      if (
        typeof session.handle.hasPointerCapture !== "function"
        || session.handle.hasPointerCapture(session.pointerId)
      ) {
        session.handle.releasePointerCapture?.(session.pointerId);
      }
    } catch {
      // Pointer capture can already be released by the browser.
    }

    restoreResizeDocumentStyles({
      cursor: session.previousCursor,
      userSelect: session.previousUserSelect,
    });

    if (outcome === "commit") {
      preferredPanelRectRef.current = {
        owner: session.owner,
        rect: session.lastRect,
      };
      setPositionedPanelRect({
        owner: session.owner,
        rect: session.lastRect,
      });
    } else if (outcome === "revert") {
      setPositionedPanelRect({
        owner: session.owner,
        rect: session.startRect,
      });
    }
  }, []);

  useEffect(() => {
    if (!resizeEnabled || !request?.resizable || !overlayOwner) {
      finishResize("discard");
      preferredPanelRectRef.current = null;
      return undefined;
    }

    const dialog = dialogRef.current;
    const panel = panelRef.current;
    if (!dialog || !panel) return undefined;

    const measuredRect = panel.getBoundingClientRect();
    const bounds = getOverlayBounds(dialog);
    const measuredWidth = panel.offsetWidth || measuredRect.width;
    const measuredHeight = panel.offsetHeight || measuredRect.height;
    if (measuredWidth <= 0 || measuredHeight <= 0) {
      return undefined;
    }

    const preferredRect = {
      height: measuredHeight,
      left: bounds.right - measuredWidth,
      top: bounds.bottom - measuredHeight,
      width: measuredWidth,
    };
    const nextPositionedRect = {
      owner: overlayOwner,
      rect: fitOverlayRectToBounds(
        preferredRect,
        bounds,
        request.resizable,
      ),
    };
    preferredPanelRectRef.current = {
      owner: overlayOwner,
      rect: preferredRect,
    };
    setPositionedPanelRect(nextPositionedRect);

    return () => {
      finishResize("discard");
    };
  }, [
    dialogRef,
    finishResize,
    overlayOwner,
    request?.resizable,
    resizeEnabled,
  ]);

  useEffect(() => {
    if (!resizeEnabled || !request?.resizable || !overlayOwner) {
      return undefined;
    }

    function fitPreferredRectToViewport() {
      finishResize("revert");
      const dialog = dialogRef.current;
      const preferred = preferredPanelRectRef.current;
      if (
        !dialog
        || !preferred
        || preferred.owner !== overlayOwner
      ) {
        return;
      }

      setPositionedPanelRect({
        owner: overlayOwner,
        rect: fitOverlayRectToBounds(
          preferred.rect,
          getOverlayBounds(dialog),
          request?.resizable,
        ),
      });
    }

    window.addEventListener("resize", fitPreferredRectToViewport);
    window.visualViewport?.addEventListener(
      "resize",
      fitPreferredRectToViewport,
    );

    return () => {
      window.removeEventListener("resize", fitPreferredRectToViewport);
      window.visualViewport?.removeEventListener(
        "resize",
        fitPreferredRectToViewport,
      );
    };
  }, [
    dialogRef,
    finishResize,
    overlayOwner,
    request?.resizable,
    resizeEnabled,
  ]);

  useEffect(() => {
    function moveResize(event: PointerEvent) {
      const session = resizeSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      event.preventDefault();
      const nextRect = resizeOverlayRect({
        bounds: session.bounds,
        deltaX: event.clientX - session.startClientX,
        deltaY: event.clientY - session.startClientY,
        direction: session.direction,
        limits: request?.resizable,
        rect: session.startRect,
      });
      session.lastRect = nextRect;
      setPositionedPanelRect({
        owner: session.owner,
        rect: nextRect,
      });
    }

    function commitResize(event: PointerEvent) {
      const session = resizeSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      finishResize("commit");
    }

    function cancelResize(event: Event) {
      if (!resizeSessionRef.current) return;
      event.preventDefault();
      finishResize("revert");
    }

    function cancelResizeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape" || !resizeSessionRef.current) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      finishResize("revert");
    }

    window.addEventListener("pointermove", moveResize, { passive: false });
    window.addEventListener("pointerup", commitResize);
    window.addEventListener("pointercancel", cancelResize);
    window.addEventListener("blur", cancelResize);
    window.addEventListener("keydown", cancelResizeOnEscape, true);

    return () => {
      finishResize("discard");
      window.removeEventListener("pointermove", moveResize);
      window.removeEventListener("pointerup", commitResize);
      window.removeEventListener("pointercancel", cancelResize);
      window.removeEventListener("blur", cancelResize);
      window.removeEventListener("keydown", cancelResizeOnEscape, true);
    };
  }, [finishResize, request?.resizable]);

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

  function beginResize(
    direction: OverlayResizeDirection,
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const dialog = dialogRef.current;
    if (
      !resizeEnabled
      || !canUseOverlayResize()
      || !request?.resizable
      || !overlayOwner
      || !activePanelRect
      || !dialog
      || event.button !== 0
      || !event.isPrimary
      || event.pointerType !== "mouse"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    finishResize("discard");

    const handle = event.currentTarget;
    try {
      handle.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is an enhancement; window listeners remain authoritative.
    }

    const computedCursor = window.getComputedStyle(handle).cursor;
    const previousDocumentStyles = applyResizeDocumentStyles(computedCursor);
    resizeSessionRef.current = {
      bounds: getOverlayBounds(dialog),
      direction,
      handle,
      lastRect: activePanelRect,
      owner: overlayOwner,
      pointerId: event.pointerId,
      previousCursor: previousDocumentStyles.cursor,
      previousUserSelect: previousDocumentStyles.userSelect,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: activePanelRect,
    };
  }

  const panelStyle: OverlayPanelStyle = {
    "--overlay-height": activePanelRect
      ? `${activePanelRect.height}px`
      : toCssDimension(request?.height, defaultOverlayHeight),
    "--overlay-left": activePanelRect
      ? `${activePanelRect.left}px`
      : undefined,
    "--overlay-top": activePanelRect
      ? `${activePanelRect.top}px`
      : undefined,
    "--overlay-width": activePanelRect
      ? `${activePanelRect.width}px`
      : toCssDimension(request?.width, defaultOverlayWidth),
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

  function submitOnEnter(event: ReactKeyboardEvent<HTMLDialogElement>) {
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
      data-resizable={resizeEnabled ? true : undefined}
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
          data-positioned={activePanelRect ? true : undefined}
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
          {request.resizable ? (
            overlayResizeDirections.map((direction) => (
              <div
                key={direction}
                className={
                  `${styles.resizeHandle} ${
                    overlayResizeHandleClasses[direction]
                  }`
                }
                aria-hidden="true"
                data-overlay-resize-handle={direction}
                onPointerDown={(event) => {
                  beginResize(direction, event);
                }}
              />
            ))
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
