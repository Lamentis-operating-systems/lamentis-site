import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OverlayProvider,
  useOverlay,
} from "@/components/site/overlay/overlay-provider";
import {
  fitOverlayRectToBounds,
  resizeOverlayRect,
  type OverlayResizeDirection,
} from "@/components/site/overlay/overlay-resize";

const bounds = {
  bottom: 800,
  left: 0,
  right: 1_000,
  top: 0,
};
const limits = {
  maxHeight: 500,
  maxWidth: 600,
  minHeight: 150,
  minWidth: 200,
};
const startRect = {
  height: 300,
  left: 100,
  top: 100,
  width: 400,
};

function domRect({
  height,
  left,
  top,
  width,
}: {
  height: number;
  left: number;
  top: number;
  width: number;
}): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  };
}

function installFinePointerEnvironment() {
  const originalMatchMedia = Object.getOwnPropertyDescriptor(
    window,
    "matchMedia",
  );
  const mediaQuery = {
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: true,
    media: "(hover: hover) and (pointer: fine)",
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  } as unknown as MediaQueryList;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => mediaQuery),
  });
  const pointerCaptureIds = new Set<number>();
  const originalSetPointerCapture = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "setPointerCapture",
  );
  const originalReleasePointerCapture = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "releasePointerCapture",
  );
  const originalHasPointerCapture = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "hasPointerCapture",
  );
  const setPointerCapture = vi.fn((pointerId: number) => {
    pointerCaptureIds.add(pointerId);
  });
  const releasePointerCapture = vi.fn((pointerId: number) => {
    pointerCaptureIds.delete(pointerId);
  });
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: {
      configurable: true,
      value: (pointerId: number) => pointerCaptureIds.has(pointerId),
    },
    releasePointerCapture: {
      configurable: true,
      value: releasePointerCapture,
    },
    setPointerCapture: {
      configurable: true,
      value: setPointerCapture,
    },
  });

  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  const rect = vi.spyOn(
    HTMLElement.prototype,
    "getBoundingClientRect",
  ).mockImplementation(function getBoundingClientRect(
    this: HTMLElement,
  ) {
    if (this instanceof HTMLDialogElement) {
      return domRect({ height: 800, left: 0, top: 0, width: 1_000 });
    }
    if (this.tagName === "SECTION") {
      return domRect({ height: 300, left: 600, top: 500, width: 400 });
    }
    return originalRect.call(this);
  });

  function restore() {
    rect.mockRestore();
    const descriptors = [
      ["setPointerCapture", originalSetPointerCapture],
      ["releasePointerCapture", originalReleasePointerCapture],
      ["hasPointerCapture", originalHasPointerCapture],
    ] as const;
    for (const [property, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, property, descriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, property);
      }
    }
    if (originalMatchMedia) {
      Object.defineProperty(window, "matchMedia", originalMatchMedia);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  }

  return {
    releasePointerCapture,
    restore,
    setPointerCapture,
  };
}

function ResizableOverlayHarness() {
  const { closeOverlay, openOverlay } = useOverlay();
  const [result, setResult] = useState("Idle");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          openOverlay({
            body: (
              <label>
                Response name
                <input aria-label="Response name" />
              </label>
            ),
            closeLabel: "Close resizable overlay",
            height: 300,
            resizable: {
              maxHeight: 600,
              maxWidth: 700,
              minHeight: 240,
              minWidth: 320,
            },
            submitAction: {
              label: "Save",
              onAction: () => {
                setResult("Saved");
                closeOverlay();
              },
            },
            title: "Resizable overlay",
            width: 400,
          });
        }}
      >
        Open resizable overlay
      </button>
      <output aria-label="Resize result">{result}</output>
    </>
  );
}

afterEach(() => {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});

describe("overlay resize geometry", () => {
  const cases: readonly [
    OverlayResizeDirection,
    number,
    number,
    Partial<typeof startRect>,
  ][] = [
    ["n", 20, 30, { height: 270, top: 130 }],
    ["ne", 20, 30, { height: 270, top: 130, width: 420 }],
    ["e", 20, 30, { width: 420 }],
    ["se", 20, 30, { height: 330, width: 420 }],
    ["s", 20, 30, { height: 330 }],
    ["sw", 20, 30, { height: 330, left: 120, width: 380 }],
    ["w", 20, 30, { left: 120, width: 380 }],
    ["nw", 20, 30, {
      height: 270,
      left: 120,
      top: 130,
      width: 380,
    }],
  ];

  it.each(cases)(
    "resizes %s while preserving its opposite edges",
    (direction, deltaX, deltaY, expected) => {
      const resized = resizeOverlayRect({
        bounds,
        deltaX,
        deltaY,
        direction,
        limits,
        rect: startRect,
      });

      expect(resized).toMatchObject(expected);
      if (direction.includes("w")) {
        expect(resized.left + resized.width).toBe(
          startRect.left + startRect.width,
        );
      } else if (direction.includes("e")) {
        expect(resized.left).toBe(startRect.left);
      }
      if (direction.includes("n")) {
        expect(resized.top + resized.height).toBe(
          startRect.top + startRect.height,
        );
      } else if (direction.includes("s")) {
        expect(resized.top).toBe(startRect.top);
      }
    },
  );

  it("enforces configured minimums, maximums, and viewport bounds", () => {
    expect(resizeOverlayRect({
      bounds,
      deltaX: -2_000,
      deltaY: 0,
      direction: "e",
      limits,
      rect: startRect,
    }).width).toBe(limits.minWidth);
    expect(resizeOverlayRect({
      bounds,
      deltaX: 2_000,
      deltaY: 0,
      direction: "e",
      limits,
      rect: startRect,
    }).width).toBe(limits.maxWidth);
    expect(resizeOverlayRect({
      bounds,
      deltaX: 0,
      deltaY: -2_000,
      direction: "s",
      limits,
      rect: startRect,
    }).height).toBe(limits.minHeight);
    expect(resizeOverlayRect({
      bounds,
      deltaX: 0,
      deltaY: 2_000,
      direction: "s",
      limits,
      rect: startRect,
    }).height).toBe(limits.maxHeight);
  });

  it("clamps a preferred rect to a small viewport and restores it later", () => {
    const preferred = {
      height: 600,
      left: 800,
      top: 600,
      width: 700,
    };
    const small = fitOverlayRectToBounds(
      preferred,
      { bottom: 400, left: 0, right: 500, top: 0 },
      { maxHeight: 900, maxWidth: 1_000 },
    );
    expect(small).toEqual({
      height: 400,
      left: 0,
      top: 0,
      width: 500,
    });

    const restored = fitOverlayRectToBounds(
      preferred,
      { bottom: 900, left: 0, right: 1_200, top: 0 },
      { maxHeight: 900, maxWidth: 1_000 },
    );
    expect(restored).toEqual({
      height: 600,
      left: 500,
      top: 300,
      width: 700,
    });
  });
});

describe("resizable overlay integration", () => {
  it("attaches global listeners only for an active resize session", async () => {
    const pointerEnvironment = installFinePointerEnvironment();
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const sessionEventTypes = [
      "blur",
      "keydown",
      "pointercancel",
      "pointermove",
      "pointerup",
    ] as const;
    const callCount = (
      listener: typeof addEventListener | typeof removeEventListener,
      type: (typeof sessionEventTypes)[number],
    ) => listener.mock.calls.filter(([eventType]) => eventType === type).length;

    try {
      render(
        <OverlayProvider>
          <ResizableOverlayHarness />
        </OverlayProvider>,
      );
      fireEvent.click(screen.getByRole("button", {
        name: "Open resizable overlay",
      }));
      const dialog = await screen.findByRole("dialog", {
        name: "Resizable overlay",
      });
      const panel = dialog.querySelector("section");
      if (!panel) throw new Error("Resizable panel must be rendered.");
      await waitFor(() => {
        expect(panel).toHaveAttribute("data-positioned", "true");
      });

      const baselineAdds = Object.fromEntries(
        sessionEventTypes.map((type) => [type, callCount(
          addEventListener,
          type,
        )]),
      );
      expect(baselineAdds).toEqual(Object.fromEntries(
        sessionEventTypes.map((type) => [type, 0]),
      ));
      const handle = panel.querySelector<HTMLElement>(
        '[data-overlay-resize-handle="se"]',
      );
      if (!handle) throw new Error("Resize handle must exist.");

      fireEvent.pointerDown(handle, {
        button: 0,
        clientX: 1_000,
        clientY: 800,
        isPrimary: true,
        pointerId: 12,
        pointerType: "mouse",
      });

      for (const type of sessionEventTypes) {
        expect(callCount(addEventListener, type)).toBe(
          baselineAdds[type] + 1,
        );
      }

      const baselineRemovals = Object.fromEntries(
        sessionEventTypes.map((type) => [type, callCount(
          removeEventListener,
          type,
        )]),
      );
      fireEvent.pointerUp(window, {
        pointerId: 12,
        pointerType: "mouse",
      });

      for (const type of sessionEventTypes) {
        expect(callCount(removeEventListener, type)).toBe(
          baselineRemovals[type] + 1,
        );
      }
    } finally {
      addEventListener.mockRestore();
      removeEventListener.mockRestore();
      pointerEnvironment.restore();
    }
  });

  it("resizes with mouse capture while preserving normal overlay actions", async () => {
    const pointerEnvironment = installFinePointerEnvironment();

    try {
      render(
        <OverlayProvider>
          <ResizableOverlayHarness />
        </OverlayProvider>,
      );
      fireEvent.click(screen.getByRole("button", {
        name: "Open resizable overlay",
      }));
      const dialog = await screen.findByRole("dialog", {
        name: "Resizable overlay",
      });
      const panel = dialog.querySelector("section");
      if (!panel) throw new Error("Resizable panel must be rendered.");

      await waitFor(() => {
        expect(panel).toHaveAttribute("data-positioned", "true");
      });
      expect(panel.style.getPropertyValue("--overlay-width")).toBe("400px");

      const westHandle = panel.querySelector<HTMLElement>(
        '[data-overlay-resize-handle="w"]',
      );
      if (!westHandle) throw new Error("West resize handle must exist.");

      fireEvent.pointerDown(westHandle, {
        button: 0,
        clientX: 600,
        clientY: 600,
        isPrimary: true,
        pointerId: 7,
        pointerType: "mouse",
      });
      fireEvent.pointerMove(window, {
        clientX: 640,
        clientY: 600,
        pointerId: 7,
        pointerType: "mouse",
      });
      expect(panel.style.getPropertyValue("--overlay-width")).toBe("360px");
      fireEvent.pointerUp(window, {
        pointerId: 7,
        pointerType: "mouse",
      });
      expect(pointerEnvironment.setPointerCapture).toHaveBeenCalledWith(7);
      expect(pointerEnvironment.releasePointerCapture).toHaveBeenCalledWith(7);

      fireEvent.pointerDown(westHandle, {
        button: 0,
        clientX: 640,
        clientY: 600,
        isPrimary: true,
        pointerId: 8,
        pointerType: "mouse",
      });
      fireEvent.pointerMove(window, {
        clientX: 590,
        clientY: 600,
        pointerId: 8,
        pointerType: "mouse",
      });
      expect(panel.style.getPropertyValue("--overlay-width")).toBe("410px");
      fireEvent.keyDown(window, { key: "Escape" });
      expect(panel.style.getPropertyValue("--overlay-width")).toBe("360px");
      expect(dialog).toBeInTheDocument();
      expect(pointerEnvironment.releasePointerCapture).toHaveBeenCalledWith(8);

      fireEvent.pointerDown(westHandle, {
        button: 0,
        clientX: 640,
        clientY: 600,
        isPrimary: true,
        pointerId: 9,
        pointerType: "touch",
      });
      fireEvent.pointerMove(window, {
        clientX: 680,
        clientY: 600,
        pointerId: 9,
        pointerType: "touch",
      });
      expect(panel.style.getPropertyValue("--overlay-width")).toBe("360px");

      fireEvent.pointerDown(westHandle, {
        button: 0,
        clientX: 640,
        clientY: 600,
        isPrimary: true,
        pointerId: 11,
        pointerType: "mouse",
      });
      fireEvent.pointerMove(window, {
        clientX: 610,
        clientY: 600,
        pointerId: 11,
        pointerType: "mouse",
      });
      expect(panel.style.getPropertyValue("--overlay-width")).toBe("390px");
      fireEvent.blur(window);
      expect(panel.style.getPropertyValue("--overlay-width")).toBe("360px");
      expect(pointerEnvironment.releasePointerCapture).toHaveBeenCalledWith(11);

      fireEvent.change(within(dialog).getByRole("textbox", {
        name: "Response name",
      }), {
        target: { value: "UserResponse" },
      });
      expect(within(dialog).getByRole("textbox", {
        name: "Response name",
      })).toHaveValue("UserResponse");
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      expect(screen.getByRole("status", {
        name: "Resize result",
      })).toHaveTextContent("Saved");
    } finally {
      pointerEnvironment.restore();
    }
  });

  it("cleans pointer interaction styles when the provider unmounts", async () => {
    const pointerEnvironment = installFinePointerEnvironment();

    try {
      const view = render(
        <OverlayProvider>
          <ResizableOverlayHarness />
        </OverlayProvider>,
      );
      fireEvent.click(screen.getByRole("button", {
        name: "Open resizable overlay",
      }));
      const dialog = await screen.findByRole("dialog", {
        name: "Resizable overlay",
      });
      const panel = dialog.querySelector("section");
      if (!panel) throw new Error("Resizable panel must be rendered.");
      await waitFor(() => {
        expect(panel).toHaveAttribute("data-positioned", "true");
      });
      const handle = panel.querySelector<HTMLElement>(
        '[data-overlay-resize-handle="se"]',
      );
      if (!handle) throw new Error("Resize handle must exist.");

      fireEvent.pointerDown(handle, {
        button: 0,
        clientX: 1_000,
        clientY: 800,
        isPrimary: true,
        pointerId: 10,
        pointerType: "mouse",
      });
      expect(document.body.style.userSelect).toBe("none");

      view.unmount();
      expect(document.body.style.userSelect).toBe("");
      expect(document.body.style.cursor).toBe("");
      expect(pointerEnvironment.releasePointerCapture).toHaveBeenCalledWith(10);
    } finally {
      pointerEnvironment.restore();
    }
  });
});
