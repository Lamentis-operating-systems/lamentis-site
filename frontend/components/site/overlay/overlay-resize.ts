export type OverlayResizeDirection =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export type OverlayRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type OverlayBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type OverlayResizeConstraints = {
  maxHeight: number;
  maxWidth: number;
  minHeight: number;
  minWidth: number;
};

export type OverlayResizeLimits = {
  maxHeight?: number;
  maxWidth?: number;
  minHeight?: number;
  minWidth?: number;
};

const defaultMinWidth = 320;
const defaultMinHeight = 240;

function finitePositive(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function availableWidth(bounds: OverlayBounds) {
  return Math.max(0, bounds.right - bounds.left);
}

function availableHeight(bounds: OverlayBounds) {
  return Math.max(0, bounds.bottom - bounds.top);
}

function resolveOverlayResizeConstraints(
  limits: OverlayResizeLimits | undefined,
  bounds: OverlayBounds,
): OverlayResizeConstraints {
  const viewportWidth = availableWidth(bounds);
  const viewportHeight = availableHeight(bounds);
  const requestedMinWidth = finitePositive(
    limits?.minWidth,
    defaultMinWidth,
  );
  const requestedMinHeight = finitePositive(
    limits?.minHeight,
    defaultMinHeight,
  );
  const requestedMaxWidth = finitePositive(
    limits?.maxWidth,
    Number.POSITIVE_INFINITY,
  );
  const requestedMaxHeight = finitePositive(
    limits?.maxHeight,
    Number.POSITIVE_INFINITY,
  );
  const minWidth = Math.min(requestedMinWidth, viewportWidth);
  const minHeight = Math.min(requestedMinHeight, viewportHeight);

  return {
    maxHeight: Math.max(
      minHeight,
      Math.min(requestedMaxHeight, viewportHeight),
    ),
    maxWidth: Math.max(
      minWidth,
      Math.min(requestedMaxWidth, viewportWidth),
    ),
    minHeight,
    minWidth,
  };
}

export function fitOverlayRectToBounds(
  rect: OverlayRect,
  bounds: OverlayBounds,
  limits?: OverlayResizeLimits,
): OverlayRect {
  const constraints = resolveOverlayResizeConstraints(limits, bounds);
  const width = clamp(
    rect.width,
    constraints.minWidth,
    constraints.maxWidth,
  );
  const height = clamp(
    rect.height,
    constraints.minHeight,
    constraints.maxHeight,
  );

  return {
    height,
    left: clamp(rect.left, bounds.left, bounds.right - width),
    top: clamp(rect.top, bounds.top, bounds.bottom - height),
    width,
  };
}

export function resizeOverlayRect({
  bounds,
  deltaX,
  deltaY,
  direction,
  limits,
  rect,
}: {
  bounds: OverlayBounds;
  deltaX: number;
  deltaY: number;
  direction: OverlayResizeDirection;
  limits?: OverlayResizeLimits;
  rect: OverlayRect;
}): OverlayRect {
  const constraints = resolveOverlayResizeConstraints(limits, bounds);
  const startRight = rect.left + rect.width;
  const startBottom = rect.top + rect.height;
  const changesWest = direction.includes("w");
  const changesEast = direction.includes("e");
  const changesNorth = direction.includes("n");
  const changesSouth = direction.includes("s");
  let left = rect.left;
  let right = startRight;
  let top = rect.top;
  let bottom = startBottom;

  if (changesWest) {
    left = clamp(
      rect.left + deltaX,
      Math.max(bounds.left, startRight - constraints.maxWidth),
      startRight - constraints.minWidth,
    );
  } else if (changesEast) {
    right = clamp(
      startRight + deltaX,
      rect.left + constraints.minWidth,
      Math.min(bounds.right, rect.left + constraints.maxWidth),
    );
  }

  if (changesNorth) {
    top = clamp(
      rect.top + deltaY,
      Math.max(bounds.top, startBottom - constraints.maxHeight),
      startBottom - constraints.minHeight,
    );
  } else if (changesSouth) {
    bottom = clamp(
      startBottom + deltaY,
      rect.top + constraints.minHeight,
      Math.min(bounds.bottom, rect.top + constraints.maxHeight),
    );
  }

  return {
    height: bottom - top,
    left,
    top,
    width: right - left,
  };
}
