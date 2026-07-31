import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiCreatorStudio } from "@/components/site/api-creator-studio";
import { ResponseSchemaEditor } from "@/components/site/response-schema-editor";
import { EmptyPage } from "@/components/site/empty-page";
import { LocaleSwitcher } from "@/components/site/footer/locale-switcher";
import { SiteFooter } from "@/components/site/footer/site-footer";
import { JsonLd } from "@/components/site/json-ld";
import { ApiContractsDownloadButton } from "@/components/site/navigation/api-contracts-download-button";
import { SiteNavigation } from "@/components/site/navigation/site-navigation";
import {
  OverlayProvider,
  useOverlay,
} from "@/components/site/overlay/overlay-provider";
import { SearchPage } from "@/components/site/search-page";
import {
  getApiCreatorStudioContent,
  getFooterContent,
  getLocaleSwitcherModel,
  getNavigationContent,
} from "@/domain/site/content";
import { assetPath } from "@/domain/site/assets";
import { apiRoutesStorage } from "@/domain/site/api-route-storage";

const navigationState = vi.hoisted(() => ({ pathname: "/en" }));
const browserDownloadState = vi.hoisted(() => ({
  downloadTextFile: vi.fn(),
}));
const apiCreatorStudioProps = {
  ...getApiCreatorStudioContent("en"),
} as const;

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock("@/domain/site/browser-download", () => ({
  downloadTextFile: browserDownloadState.downloadTextFile,
}));

function renderWithOverlay(ui: ReactNode) {
  return render(<OverlayProvider>{ui}</OverlayProvider>);
}

function TestActionIcon({ testId }: { testId: string }) {
  return (
    <svg
      data-testid={testId}
      aria-hidden="true"
      viewBox="0 0 10 10"
    >
      <circle cx="5" cy="5" r="4" />
    </svg>
  );
}

function OverlayServiceHarness() {
  const { openOverlay } = useOverlay();
  const [result, setResult] = useState("Idle");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          openOverlay({
            body: (
              <>
                <p>Scrollable content</p>
                <button type="button">Higher priority action</button>
              </>
            ),
            closeLabel: "Close demo overlay",
            height: "30rem",
            placement: "bottom-right",
            submitAction: {
              label: "Save",
              onAction: () => setResult("Submitted"),
            },
            title: "Demo overlay",
            width: 720,
          });
        }}
      >
        Open demo overlay
      </button>
      <button
        type="button"
        onClick={() => {
          openOverlay({
            cancelAction: {
              icon: <TestActionIcon testId="cancel-icon" />,
              label: "Cancel",
              onAction: () => setResult("Cancelled"),
            },
            closeLabel: "Close action overlay",
            submitAction: {
              icon: <TestActionIcon testId="continue-icon" />,
              iconPosition: "right",
              label: "Continue",
              onAction: () => setResult("Continued"),
            },
            title: "Action overlay",
          });
        }}
      >
        Open action overlay
      </button>
      <output aria-label="Overlay result">{result}</output>
    </>
  );
}

function OverlayOwnershipHarness({
  onFirstDismiss,
  onFirstSubmit,
  onReplacementDismiss,
  onReplacementSubmit,
}: {
  onFirstDismiss: () => void;
  onFirstSubmit: () => void;
  onReplacementDismiss: () => void;
  onReplacementSubmit: () => void;
}) {
  const { closeOverlay, openOverlay } = useOverlay();
  const [result, setResult] = useState("Idle");

  function openReplacement() {
    openOverlay({
      closeLabel: "Close replacement overlay",
      onDismiss: onReplacementDismiss,
      submitAction: {
        label: "Use replacement",
        onAction: () => {
          onReplacementSubmit();
          setResult("Replacement submitted");
        },
      },
      title: "Replacement overlay",
    });
  }

  function openFirst() {
    openOverlay({
      body: (
        <>
          <button type="button" onClick={openReplacement}>
            Replace immediately
          </button>
          <button
            type="button"
            onClick={() => {
              closeOverlay();
              queueMicrotask(openReplacement);
            }}
          >
            Close then replace
          </button>
        </>
      ),
      cancelAction: {
        label: "Cancel and replace",
        onAction: openReplacement,
      },
      closeLabel: "Close first overlay",
      onDismiss: onFirstDismiss,
      submitAction: {
        label: "Use first",
        onAction: () => {
          onFirstSubmit();
          setResult("First submitted");
        },
      },
      title: "First overlay",
    });
  }

  return (
    <>
      <button type="button" onClick={openFirst}>
        Open first overlay
      </button>
      <output aria-label="Ownership result">{result}</output>
    </>
  );
}

function renderOverlayOwnershipHarness() {
  const callbacks = {
    onFirstDismiss: vi.fn(),
    onFirstSubmit: vi.fn(),
    onReplacementDismiss: vi.fn(),
    onReplacementSubmit: vi.fn(),
  };

  renderWithOverlay(<OverlayOwnershipHarness {...callbacks} />);
  fireEvent.click(screen.getByRole("button", {
    name: "Open first overlay",
  }));

  return callbacks;
}

function SameIdFormReplacementHarness() {
  const { openOverlay } = useOverlay();
  const formId = "shared-overlay-form";

  function openReplacement() {
    openOverlay({
      body: (
        <form id={formId} aria-label="Replacement form">
          <label>
            Replacement required field
            <input aria-label="Replacement required field" required />
          </label>
        </form>
      ),
      closeLabel: "Close replacement form overlay",
      submitAction: {
        formId,
        label: "Save replacement",
      },
      title: "Replacement form overlay",
    });
  }

  function openFirst() {
    openOverlay({
      body: (
        <form id={formId} aria-label="First form">
          <label>
            First required field
            <input
              aria-label="First required field"
              defaultValue="valid"
              required
            />
          </label>
          <button type="button" onClick={openReplacement}>
            Replace with same form id
          </button>
        </form>
      ),
      closeLabel: "Close first form overlay",
      submitAction: {
        formId,
        label: "Save first",
      },
      title: "First form overlay",
    });
  }

  return (
    <button type="button" onClick={openFirst}>
      Open form overlay
    </button>
  );
}

function DynamicConstraintForm() {
  const [isRequired, setIsRequired] = useState(false);

  return (
    <form id="dynamic-constraint-form">
      <label>
        Dynamic field
        <input aria-label="Dynamic field" required={isRequired} />
      </label>
      <button
        type="button"
        onClick={() => setIsRequired((current) => !current)}
      >
        {isRequired ? "Make optional" : "Make required"}
      </button>
    </form>
  );
}

function DynamicConstraintOverlayHarness() {
  const { openOverlay } = useOverlay();

  return (
    <button
      type="button"
      onClick={() => {
        openOverlay({
          body: <DynamicConstraintForm />,
          closeLabel: "Close dynamic constraint overlay",
          submitAction: {
            formId: "dynamic-constraint-form",
            label: "Save dynamic form",
          },
          title: "Dynamic constraint overlay",
        });
      }}
    >
      Open dynamic constraint overlay
    </button>
  );
}

function OverlayUnmountHarness({ onDismiss }: { onDismiss: () => void }) {
  const { openOverlay } = useOverlay();

  return (
    <button
      type="button"
      onClick={() => {
        openOverlay({
          closeLabel: "Close unmount overlay",
          onDismiss,
          title: "Unmount overlay",
        });
      }}
    >
      Open unmount overlay
    </button>
  );
}

describe("empty pages", () => {
  it("keeps a named main landmark and document heading without visible copy", () => {
    render(<EmptyPage label="Today" />);
    const main = screen.getByRole("main", { name: "Today" });
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(within(main).getByRole("heading", {
      level: 1,
      name: "Today",
    })).toBeInTheDocument();
  });
});

describe("structured data", () => {
  it("escapes markup delimiters before embedding JSON-LD", () => {
    const { container } = render(
      <JsonLd data={{ name: "</script><script>alert(1)</script>" }} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toContain("\\u003c/script>");
    expect(script?.innerHTML).not.toContain("<script>");
  });
});

describe("overlay provider", () => {
  it("supports custom sizing and dismisses from the backdrop with focus return", async () => {
    renderWithOverlay(<OverlayServiceHarness />);

    const trigger = screen.getByRole("button", { name: "Open demo overlay" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Demo overlay" });
    const panel = dialog.querySelector("section");
    expect(dialog).toHaveAttribute("data-placement", "bottom-right");
    expect(panel?.style.getPropertyValue("--overlay-width")).toBe("720px");
    expect(panel?.style.getPropertyValue("--overlay-height")).toBe("30rem");
    expect(dialog.querySelector("header")).toHaveTextContent("Demo overlay");
    expect(dialog).toHaveTextContent("Scrollable content");
    expect(dialog.querySelector("footer")).toHaveTextContent("Save");
    expect(dialog).not.toHaveTextContent("Cancel");
    expect(dialog).toHaveFocus();

    fireEvent.keyDown(
      within(dialog).getByRole("button", {
        name: "Higher priority action",
      }),
      { key: "Enter" },
    );
    expect(screen.getByRole("status", { name: "Overlay result" })).toHaveTextContent(
      "Idle",
    );
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(screen.getByRole("status", { name: "Overlay result" })).toHaveTextContent(
      "Submitted",
    );

    fireEvent.click(dialog);
    expect(dialog).toHaveAttribute("data-state", "closing");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Demo overlay" }),
      ).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("renders configured action icons and closes from the secondary cancel action", async () => {
    renderWithOverlay(<OverlayServiceHarness />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open action overlay" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Action overlay",
    });
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const submit = within(dialog).getByRole("button", { name: "Continue" });
    const cancelIcon = within(cancel).getByTestId("cancel-icon");
    const submitIcon = within(submit).getByTestId("continue-icon");

    expect(cancel.firstElementChild).toContainElement(cancelIcon);
    expect(submit.lastElementChild).toContainElement(submitIcon);
    expect(cancel.className).not.toBe(submit.className);

    fireEvent.click(cancel);
    expect(screen.getByRole("status", { name: "Overlay result" })).toHaveTextContent(
      "Cancelled",
    );
    expect(dialog).toHaveAttribute("data-state", "closing");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Action overlay" }),
      ).not.toBeInTheDocument();
    });
  });

  it("dismisses a replaced owner once and submits only the replacement with Enter", async () => {
    const callbacks = renderOverlayOwnershipHarness();
    const firstDialog = await screen.findByRole("dialog", {
      name: "First overlay",
    });

    fireEvent.click(within(firstDialog).getByRole("button", {
      name: "Replace immediately",
    }));

    const replacementDialog = await screen.findByRole("dialog", {
      name: "Replacement overlay",
    });
    expect(callbacks.onFirstDismiss).toHaveBeenCalledTimes(1);
    expect(callbacks.onReplacementDismiss).not.toHaveBeenCalled();

    fireEvent.keyDown(replacementDialog, { key: "Enter" });
    expect(callbacks.onFirstSubmit).not.toHaveBeenCalled();
    expect(callbacks.onReplacementSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", {
      name: "Ownership result",
    })).toHaveTextContent("Replacement submitted");
  });

  it("keeps a replacement opened during the previous owner's closing phase", async () => {
    const callbacks = renderOverlayOwnershipHarness();
    const firstDialog = await screen.findByRole("dialog", {
      name: "First overlay",
    });

    fireEvent.click(within(firstDialog).getByRole("button", {
      name: "Close then replace",
    }));
    expect(firstDialog).toHaveAttribute("data-state", "closing");

    const replacementDialog = await screen.findByRole("dialog", {
      name: "Replacement overlay",
    });
    expect(callbacks.onFirstDismiss).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => window.setTimeout(resolve, 75));
    expect(replacementDialog).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("dialog", {
      name: "Replacement overlay",
    })).toBe(replacementDialog);
    expect(callbacks.onReplacementDismiss).not.toHaveBeenCalled();
  });

  it("does not let cancel cleanup close a replacement opened by its callback", async () => {
    const callbacks = renderOverlayOwnershipHarness();
    const firstDialog = await screen.findByRole("dialog", {
      name: "First overlay",
    });

    fireEvent.click(within(firstDialog).getByRole("button", {
      name: "Cancel and replace",
    }));

    const replacementDialog = await screen.findByRole("dialog", {
      name: "Replacement overlay",
    });
    expect(replacementDialog).toHaveAttribute("data-state", "open");
    expect(callbacks.onFirstDismiss).toHaveBeenCalledTimes(1);
    expect(callbacks.onReplacementDismiss).not.toHaveBeenCalled();
  });

  it("calls onDismiss exactly once when completion signals repeat", async () => {
    const callbacks = renderOverlayOwnershipHarness();
    const dialog = await screen.findByRole("dialog", {
      name: "First overlay",
    });
    const panel = dialog.querySelector("section");
    if (!panel) throw new Error("The overlay panel must exist.");

    fireEvent.click(within(dialog).getByRole("button", {
      name: "Close first overlay",
    }));
    expect(dialog).toHaveAttribute("data-state", "closing");
    fireEvent.animationEnd(panel);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", {
        name: "First overlay",
      })).not.toBeInTheDocument();
    });
    await new Promise((resolve) => window.setTimeout(resolve, 75));
    fireEvent(dialog, new Event("close"));

    expect(callbacks.onFirstDismiss).toHaveBeenCalledTimes(1);
  });

  it("finalizes an open owner when the native dialog closes", async () => {
    const callbacks = renderOverlayOwnershipHarness();
    const dialog = await screen.findByRole("dialog", {
      name: "First overlay",
    });

    fireEvent(dialog, new Event("close"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", {
        name: "First overlay",
      })).not.toBeInTheDocument();
    });
    expect(callbacks.onFirstDismiss).toHaveBeenCalledTimes(1);
  });

  it("rebinds validity when a replacement reuses the same form id", async () => {
    renderWithOverlay(<SameIdFormReplacementHarness />);
    fireEvent.click(screen.getByRole("button", {
      name: "Open form overlay",
    }));

    const firstDialog = await screen.findByRole("dialog", {
      name: "First form overlay",
    });
    await waitFor(() => {
      expect(within(firstDialog).getByRole("button", {
        name: "Save first",
      })).toBeEnabled();
    });
    fireEvent.click(within(firstDialog).getByRole("button", {
      name: "Replace with same form id",
    }));

    const replacementDialog = await screen.findByRole("dialog", {
      name: "Replacement form overlay",
    });
    const replacementSave = within(replacementDialog).getByRole("button", {
      name: "Save replacement",
    });
    expect(replacementSave).toBeDisabled();

    fireEvent.change(within(replacementDialog).getByRole("textbox", {
      name: "Replacement required field",
    }), {
      target: { value: "valid" },
    });
    await waitFor(() => expect(replacementSave).toBeEnabled());
  });

  it("rechecks bound form validity after a constraint attribute changes", async () => {
    renderWithOverlay(<DynamicConstraintOverlayHarness />);
    fireEvent.click(screen.getByRole("button", {
      name: "Open dynamic constraint overlay",
    }));

    const dialog = await screen.findByRole("dialog", {
      name: "Dynamic constraint overlay",
    });
    const save = within(dialog).getByRole("button", {
      name: "Save dynamic form",
    });
    await waitFor(() => expect(save).toBeEnabled());

    fireEvent.click(within(dialog).getByRole("button", {
      name: "Make required",
    }));
    await waitFor(() => expect(save).toBeDisabled());

    fireEvent.click(within(dialog).getByRole("button", {
      name: "Make optional",
    }));
    await waitFor(() => expect(save).toBeEnabled());
  });

  it("dismisses the active owner exactly once when the provider unmounts", async () => {
    const onDismiss = vi.fn();
    const view = renderWithOverlay(
      <OverlayUnmountHarness onDismiss={onDismiss} />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Open unmount overlay",
    }));
    await screen.findByRole("dialog", { name: "Unmount overlay" });

    view.unmount();

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("derives the exit fallback from the rendered animation timing", () => {
    vi.useFakeTimers();
    const callbacks = renderOverlayOwnershipHarness();
    const dialog = screen.getByRole("dialog", { name: "First overlay" });
    const panel = dialog.querySelector("section");
    if (!panel) throw new Error("The overlay panel must exist.");

    const readComputedStyle = window.getComputedStyle.bind(window);
    const panelComputedStyle = readComputedStyle(panel);
    const animatedPanelStyle = new Proxy(panelComputedStyle, {
      get(target, property) {
        if (property === "animationDelay") return "20ms";
        if (property === "animationDuration") return "180ms";

        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const computedStyle = vi.spyOn(window, "getComputedStyle")
      .mockImplementation((element) => (
        element === panel ? animatedPanelStyle : readComputedStyle(element)
      ));

    try {
      fireEvent.click(within(dialog).getByRole("button", {
        name: "Close first overlay",
      }));

      act(() => vi.advanceTimersByTime(249));
      expect(dialog).toHaveAttribute("data-state", "closing");
      expect(callbacks.onFirstDismiss).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(1));
      expect(screen.queryByRole("dialog", {
        name: "First overlay",
      })).not.toBeInTheDocument();
      expect(callbacks.onFirstDismiss).toHaveBeenCalledTimes(1);
    } finally {
      computedStyle.mockRestore();
      vi.useRealTimers();
    }
  });
});

describe("search page", () => {
  it("renders an accessible inert search field without action controls", () => {
    render(
      <SearchPage
        heading="Search sites"
        label="Search sites"
        placeholder="Search"
      />,
    );

    const main = screen.getByRole("main", { name: "Search sites" });
    const search = screen.getByRole("search", { name: "Search sites" });
    const input = screen.getByRole("searchbox", { name: "Search sites" });

    expect(main).toContainElement(search);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Search sites",
    );
    expect(search).toContainElement(input);
    expect(input).toHaveAttribute("placeholder", "Search");
    expect(search.querySelector("form")).not.toBeInTheDocument();
    expect(search.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("exposes the API route editor as a named group, not a search landmark", () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const routeEditor = screen.getByRole("group", {
      name: "API endpoint path",
    });
    const routeInput = within(routeEditor).getByRole("textbox", {
      name: "API endpoint path",
    });

    expect(routeEditor).toContainElement(routeInput);
    expect(routeInput).toHaveAccessibleDescription(
      "A leading slash is added automatically.",
    );
    expect(routeInput).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("search", {
      name: "API endpoint path",
    })).not.toBeInTheDocument();
  });

  it("announces a distinct route syntax error without changing the surface", () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(input, { target: { value: "users/{}" } });

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "A leading slash is added automatically. "
      + "Use lowercase letters and numbers in path segments. "
      + "Wrap parameter names in braces and start them with a letter.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use lowercase letters and numbers in path segments.",
    );

    fireEvent.change(input, { target: { value: "users/{userid}" } });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription(
      "A leading slash is added automatically.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("selects an HTTP method from an accessible overlay", async () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const trigger = screen.getByRole("button", { name: "HTTP method GET" });
    expect(trigger).toHaveTextContent("GET");
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));

    const menu = screen.getByRole("list", { name: "HTTP method" });
    expect(menu).toHaveTextContent("GET");
    expect(menu).toHaveTextContent("POST");
    expect(menu).toHaveTextContent("PATCH");
    expect(menu).toHaveTextContent("DELETE");

    const getOption = screen.getByRole("button", { name: "GET" });
    const postOption = screen.getByRole("button", { name: "POST" });
    expect(getOption.querySelector("svg")).toBeInTheDocument();
    expect(postOption.querySelector("svg")).not.toBeInTheDocument();

    fireEvent.click(postOption);
    expect(trigger).toHaveTextContent("POST");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveAttribute("data-state", "closing");
    expect(menu).toHaveAttribute("aria-hidden", "true");
    expect(menu).toHaveAttribute("inert");
    expect(screen.queryByRole("list", { name: "HTTP method" })).not.toBeInTheDocument();
    fireEvent.animationEnd(menu);
    await waitFor(() => expect(menu).not.toBeInTheDocument());

    const action = screen.getByRole("button", { name: "Add API route" });
    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    }) as HTMLInputElement;
    expect(screen.getByText("/", { exact: true })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(input).toHaveAttribute("placeholder", "type path here...");
    expect(action).toBeDisabled();

    fireEvent.change(input, { target: { value: "users//posts" } });
    expect(action).toBeDisabled();

    fireEvent.change(input, { target: { value: "users/{uuid}/posts" } });
    expect(input).toHaveValue("users / {uuid} / posts");
    expect(action).toBeEnabled();

    fireEvent.change(input, { target: { value: "/teams/{teamid}" } });
    expect(input).toHaveValue("teams / {teamid}");
    expect(action).toBeEnabled();

    fireEvent.change(input, { target: { value: "users/{uuid}/posts" } });
    const bracedSegment = screen.getByText("{uuid}");
    expect(bracedSegment).toBeInTheDocument();
    expect(bracedSegment.closest('[aria-hidden="true"]')).toHaveTextContent(
      "users / {uuid} / posts",
    );

    fireEvent.click(action);

    const responseDialog = await screen.findByRole("dialog", {
      name: "Add a data structure to this route",
    });
    const responsePanel = responseDialog.querySelector("section");
    expect(responseDialog).toHaveAttribute("data-placement", "bottom-right");
    expect(responsePanel?.style.getPropertyValue("--overlay-width")).toBe(
      "var(--overlay-size-large)",
    );
    expect(responsePanel?.style.getPropertyValue("--overlay-height")).toBe(
      "var(--overlay-size-large)",
    );
    await waitFor(() => {
      expect(within(responseDialog).getByRole("textbox", {
        name: "Response type",
      })).toHaveFocus();
    });
    expect(responseDialog.querySelector("header")).toHaveTextContent(
      "Add a data structure to this route",
    );
    const routeContext = within(responseDialog).getByRole("group", {
      name: "API endpoint path",
    });
    const routeMethod = within(routeContext).getByRole("button", {
      name: "HTTP method POST",
    });
    const overlayPathInput = within(routeContext).getByRole("textbox", {
      name: "API endpoint path",
    });
    const overlayResponseTypeInput = within(responseDialog).getByRole("textbox", {
      name: "Response type",
    });
    expect(routeContext.children).toHaveLength(2);
    expect(routeMethod.parentElement).toHaveAttribute(
      "data-height",
      "large",
    );
    expect(routeMethod.parentElement).toHaveAttribute(
      "data-rounded",
      "true",
    );
    expect(routeContext.lastElementChild?.className).toBe(
      overlayResponseTypeInput.parentElement?.className,
    );
    expect(routeMethod).toHaveTextContent("POST");
    expect(overlayPathInput).toHaveValue("users / {uuid} / posts");
    expect(within(routeContext).queryByRole("button", {
      name: "Route actions /users/{uuid}/posts",
    })).not.toBeInTheDocument();
    fireEvent.click(routeMethod);
    fireEvent.click(
      within(within(responseDialog).getByRole("list", {
        name: "HTTP method",
      })).getByRole("button", { name: "PATCH" }),
    );
    expect(routeMethod).toHaveTextContent("PATCH");
    expect(within(responseDialog).getByText(
      "Create a response type or use an existing one as an editable template.",
    )).toBeInTheDocument();
    expect(within(responseDialog).getByRole("textbox", {
      name: "Response type",
    })).toHaveAccessibleDescription(
      "Create a response type or use an existing one as an editable template.",
    );
    expect(within(responseDialog).getByRole("heading", {
      level: 3,
      name: "Response type",
    })).toBeInTheDocument();
    expect(within(responseDialog).queryByRole("heading", {
      name: "Response properties",
    })).not.toBeInTheDocument();
    expect(within(responseDialog).queryByText(
      "Define the fields returned in this response.",
    )).not.toBeInTheDocument();
    expect(within(responseDialog).getByRole("textbox", {
      name: "Response type",
    })).toHaveAttribute("placeholder", "Name your response type");
    expect(responseDialog.querySelector("footer")).toHaveTextContent("Save");

    const saveResponse = within(responseDialog).getByRole("button", {
      name: "Save",
    });
    expect(saveResponse.firstElementChild?.querySelector("svg")).not.toBeNull();
    expect(saveResponse.lastElementChild).toHaveTextContent("Save");
    await waitFor(() => expect(saveResponse).toBeDisabled());

    fireEvent.change(
      screen.getByRole("textbox", { name: "Response type" }),
      { target: { value: "UserResponse" } },
    );
    await waitFor(() => expect(saveResponse).toBeEnabled());

    const responseTypeRegion = within(responseDialog).getByRole("region", {
      name: "Response type",
    });
    const addPropertyButton = within(responseTypeRegion).getByRole("button", {
      name: "Add property",
    });
    expect(addPropertyButton).toHaveTextContent("");
    expect(addPropertyButton.querySelector("svg")).toBeInTheDocument();
    fireEvent.click(addPropertyButton);
    await waitFor(() => expect(saveResponse).toBeDisabled());

    fireEvent.change(
      screen.getByRole("textbox", { name: /^Property name / }),
      { target: { value: "items" } },
    );
    await waitFor(() => expect(saveResponse).toBeEnabled());

    const propertyType = screen.getByRole("button", {
      name: /^Property type 1 string$/,
    });
    const responseTypeInput = screen.getByRole("textbox", {
      name: "Response type",
    });
    const propertyNameInput = screen.getByRole("textbox", {
      name: /^Property name /,
    });
    expect(within(responseDialog).queryByText(
      "Property name",
    )).not.toBeInTheDocument();
    expect(within(responseDialog).queryByText(
      "Property type",
    )).not.toBeInTheDocument();
    expect(propertyType.parentElement).toHaveAttribute(
      "data-height",
      "large",
    );
    expect(propertyType.parentElement).toHaveAttribute(
      "data-rounded",
      "true",
    );
    expect(propertyNameInput.parentElement?.className).toBe(
      responseTypeInput.parentElement?.className,
    );
    fireEvent.click(propertyType);
    const propertyTypeMenu = screen.getByRole("list", {
      name: /^Property type 1$/,
    });
    expect(propertyType).toHaveAttribute("aria-expanded", "true");
    expect(
      within(propertyTypeMenu).getByRole("button", { name: "string" })
        .querySelector("svg"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(propertyTypeMenu).getByRole("button", { name: "array" }),
    );
    expect(propertyType).toHaveTextContent("array");
    expect(propertyTypeMenu).toHaveAttribute("data-state", "closing");
    expect(
      within(responseDialog).queryByText("Array item type"),
    ).not.toBeInTheDocument();
    expect(within(responseDialog).getByText("of")).toBeInTheDocument();

    const arrayItemType = screen.getByRole("button", {
      name: /^Array item type 1 string$/,
    });
    fireEvent.click(arrayItemType);
    fireEvent.click(
      within(screen.getByRole("list", { name: /^Array item type 1$/ }))
        .getByRole("button", { name: "number" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    const propertyNameInputs = screen.getAllByRole("textbox", {
      name: /^Property name /,
    });
    fireEvent.change(propertyNameInputs[1], {
      target: { value: "status" },
    });
    expect(
      responseDialog.querySelectorAll('[data-is-array="true"]'),
    ).toHaveLength(1);
    expect(
      within(responseDialog).queryByText("Array item type"),
    ).not.toBeInTheDocument();
    expect(within(responseDialog).getAllByText("of")).toHaveLength(1);
    const optionalToggle = screen.getAllByRole("button", {
      name: /^Optional /,
    })[0];
    expect(optionalToggle).toHaveAttribute("data-variant", "transparent");
    expect(optionalToggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(optionalToggle);
    expect(optionalToggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Response type" }),
      { key: "Enter" },
    );
    expect(responseDialog).toHaveAttribute("data-state", "closing");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", {
          name: "Add a data structure to this route",
        }),
      ).not.toBeInTheDocument();
    });

    const route = screen.getByRole("listitem");
    expect(screen.getByRole("list", { name: "API routes" })).toContainElement(
      route,
    );
    expect(route).toHaveTextContent("PATCH");
    expect(route).toHaveTextContent("/users/{uuid}/posts");
    expect(route).toHaveTextContent("Response type: UserResponse");
    expect(screen.queryByText("Method")).not.toBeInTheDocument();
    expect(screen.queryByText("Route")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(JSON.parse(
        window.localStorage.getItem(apiRoutesStorage.key) ?? "[]",
      )).toMatchObject([
        {
          method: "PATCH",
          path: "/users/{uuid}/posts",
          response: { typeName: "UserResponse" },
        },
      ]);
    });

    const savedMethod = screen.getByRole("button", {
      name: "HTTP method /users/{uuid}/posts PATCH",
    });
    expect(savedMethod).toHaveTextContent("PATCH");
    fireEvent.click(savedMethod);
    const savedMethodMenu = screen.getByRole("list", {
      name: "HTTP method /users/{uuid}/posts",
    });
    expect(savedMethodMenu).toBeInTheDocument();
    fireEvent.click(
      within(savedMethodMenu).getByRole("button", { name: "PATCH" }),
    );
    expect(savedMethod).toHaveTextContent("PATCH");

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const routeActions = screen.getByRole("button", {
      name: "Route actions /users/{uuid}/posts",
    });
    fireEvent.click(routeActions);
    let routeActionsMenu = screen.getByRole("list", {
      name: "Route actions /users/{uuid}/posts",
    });
    const editAction = within(routeActionsMenu).getByRole("button", {
      name: "Edit /users/{uuid}/posts",
    });
    const copyAction = within(routeActionsMenu).getByRole("button", {
      name: "Copy /users/{uuid}/posts",
    });
    const deleteAction = within(routeActionsMenu).getByRole("button", {
      name: "Delete /users/{uuid}/posts",
    });
    expect(editAction).toHaveTextContent("Edit");
    expect(copyAction).toHaveTextContent("Copy");
    expect(deleteAction).toHaveTextContent("Delete");
    expect(editAction.querySelector("svg")).toBeInTheDocument();
    expect(copyAction.querySelector("svg")).toBeInTheDocument();
    expect(deleteAction.querySelector("svg")).toBeInTheDocument();

    fireEvent.click(copyAction);
    expect(writeText).toHaveBeenCalledWith("/users/{uuid}/posts");

    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    writeText.mockRejectedValueOnce(new Error("Clipboard denied"));
    fireEvent.click(routeActions);
    routeActionsMenu = screen.getByRole("list", {
      name: "Route actions /users/{uuid}/posts",
    });
    fireEvent.click(
      within(routeActionsMenu).getByRole("button", {
        name: "Copy /users/{uuid}/posts",
      }),
    );
    await waitFor(() => expect(execCommand).toHaveBeenCalledWith("copy"));

    execCommand.mockReturnValueOnce(false);
    writeText.mockRejectedValueOnce(new Error("Clipboard denied"));
    fireEvent.click(routeActions);
    routeActionsMenu = screen.getByRole("list", {
      name: "Route actions /users/{uuid}/posts",
    });
    fireEvent.click(
      within(routeActionsMenu).getByRole("button", {
        name: "Copy /users/{uuid}/posts",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "The route could not be copied.",
    );

    fireEvent.click(routeActions);
    routeActionsMenu = screen.getByRole("list", {
      name: "Route actions /users/{uuid}/posts",
    });
    fireEvent.click(
      within(routeActionsMenu).getByRole("button", {
        name: "Edit /users/{uuid}/posts",
      }),
    );
    const editDialog = await screen.findByRole("dialog", {
      name: "Edit this route",
    });
    expect(editDialog.querySelector("header")).toHaveTextContent(
      "Edit this route",
    );
    expect(editDialog.querySelector("footer")).toHaveTextContent("Save");
    const saveRoute = within(editDialog).getByRole("button", { name: "Save" });
    expect(saveRoute.firstElementChild?.querySelector("svg")).not.toBeNull();
    expect(saveRoute.lastElementChild).toHaveTextContent("Save");
    expect(within(editDialog).getByText(
      "Update this response type or use an existing one as an editable template.",
    )).toBeInTheDocument();
    expect(within(editDialog).queryByText(
      "Update the fields returned in this response.",
    )).not.toBeInTheDocument();
    expect(within(editDialog).getByRole("button", {
      name: "HTTP method PATCH",
    })).toHaveTextContent("PATCH");
    expect(within(editDialog).getByRole("textbox", {
      name: "API endpoint path",
    })).toHaveValue("users / {uuid} / posts");
    expect(within(editDialog).getByRole("textbox", {
      name: "Response type",
    })).toHaveValue("UserResponse");
    await waitFor(() => {
      expect(within(editDialog).getByRole("textbox", {
        name: "Response type",
      })).toHaveFocus();
    });
    expect(within(editDialog).getAllByRole("textbox", {
      name: /^Property name /,
    })).toHaveLength(2);
    expect(within(editDialog).getAllByRole("textbox", {
      name: /^Property name /,
    })[0]).toHaveValue("items");
    expect(within(editDialog).getAllByRole("button", {
      name: /^Property type /,
    })[0]).toHaveTextContent("array");
    expect(within(editDialog).getByRole("button", {
      name: /^Array item type 1 number$/,
    })).toHaveTextContent("number");
    await waitFor(() => expect(saveRoute).toBeEnabled());
    fireEvent.click(saveRoute);
    expect(editDialog).toHaveAttribute("data-state", "closing");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Edit this route" }),
      ).not.toBeInTheDocument();
    });

    expect(input).toHaveValue("");
    expect(action).toBeDisabled();

    fireEvent.click(routeActions);
    routeActionsMenu = screen.getByRole("list", {
      name: "Route actions /users/{uuid}/posts",
    });
    fireEvent.click(
      within(routeActionsMenu).getByRole("button", {
        name: "Delete /users/{uuid}/posts",
      }),
    );
    expect(
      screen.queryByRole("list", { name: "API routes" }),
    ).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("keeps overlay submit disabled for duplicate response properties", async () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const routeInput = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(routeInput, { target: { value: "users" } });
    fireEvent.click(screen.getByRole("button", { name: "Add API route" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Add a data structure to this route",
    });
    const save = within(dialog).getByRole("button", { name: "Save" });
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Response type" }),
      { target: { value: "UserResponse" } },
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add property" }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add property" }),
    );

    const propertyNames = within(dialog).getAllByRole("textbox", {
      name: /^Property name /,
    });
    fireEvent.change(propertyNames[0]!, { target: { value: "id" } });
    fireEvent.change(propertyNames[1]!, { target: { value: "id" } });

    await waitFor(() => {
      expect(save).toBeDisabled();
      expect(propertyNames[0]).toHaveAttribute("aria-invalid", "true");
      expect(propertyNames[1]).toHaveAttribute("aria-invalid", "true");
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "Property names must be unique.",
      );
    });

    fireEvent.change(propertyNames[1]!, { target: { value: "name" } });
    await waitFor(() => {
      expect(save).toBeEnabled();
      expect(propertyNames[0]).not.toHaveAttribute("aria-invalid");
      expect(propertyNames[1]).not.toHaveAttribute("aria-invalid");
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    });

    const responseType = within(dialog).getByRole("textbox", {
      name: "Response type",
    });
    fireEvent.change(responseType, { target: { value: "class" } });
    await waitFor(() => {
      expect(save).toBeDisabled();
      expect(responseType).toHaveAttribute("aria-invalid", "true");
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "Use a valid TypeScript identifier.",
      );
    });

    fireEvent.change(responseType, { target: { value: "UserResponse" } });
    await waitFor(() => {
      expect(save).toBeEnabled();
      expect(responseType).not.toHaveAttribute("aria-invalid");
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("prefills reusable response types and requires a new name for schema edits", async () => {
    const onSave = vi.fn(() => "saved" as const);
    const existingResponseSchemas = [
      {
        fields: [
          { name: "id", optional: false, type: "string" as const },
        ],
        typeName: "UserResponse",
      },
      {
        fields: [
          { name: "id", optional: false, type: "string" as const },
        ],
        typeName: "UserResponse",
      },
      {
        fields: [
          { name: "value", optional: false, type: "string" as const },
        ],
        typeName: "ConflictingResponse",
      },
      {
        fields: [
          { name: "value", optional: false, type: "number" as const },
        ],
        typeName: "ConflictingResponse",
      },
    ];

    render(
      <>
        <ResponseSchemaEditor
          content={apiCreatorStudioProps.responseEditor}
          existingResponseSchemas={existingResponseSchemas}
          formId="response-prefill-form"
          getRouteValidationReason={() => null}
          onRouteMethodChange={vi.fn()}
          onSave={onSave}
          route={{
            id: 11,
            method: "GET",
            path: "/accounts",
          }}
          routeInputContent={{
            duplicatePathError: apiCreatorStudioProps.duplicatePathError,
            invalidPathError: apiCreatorStudioProps.invalidPathError,
            label: apiCreatorStudioProps.label,
            methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
            pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
            placeholder: apiCreatorStudioProps.placeholder,
          }}
        />
        <button type="submit" form="response-prefill-form">
          Save response
        </button>
      </>,
    );

    const form = document.querySelector<HTMLFormElement>(
      "#response-prefill-form",
    );
    if (!form) throw new Error("The response form must be rendered.");
    const responseType = screen.getByRole("textbox", {
      name: "Response type",
    });
    const responseTypeTemplate = screen.getByRole("button", {
      name: "Response type template New",
    });
    expect(responseTypeTemplate).toHaveTextContent(
      "New",
    );
    fireEvent.click(responseTypeTemplate);
    const responseTypeTemplateMenu = screen.getByRole("list", {
      name: "Response type template",
    });
    expect(within(responseTypeTemplateMenu).getAllByRole("button", {
      name: "UserResponse",
    })).toHaveLength(1);
    expect(within(responseTypeTemplateMenu).queryByRole("button", {
      name: "ConflictingResponse",
    })).not.toBeInTheDocument();
    fireEvent.click(
      within(responseTypeTemplateMenu).getByRole("button", {
        name: "UserResponse",
      }),
    );

    await waitFor(() => {
      expect(responseType).toHaveValue("UserResponse");
      expect(screen.getByRole("textbox", {
        name: /^Property name /,
      })).toHaveValue("id");
      expect(form).toBeValid();
    });
    fireEvent.submit(form);
    expect(onSave).toHaveBeenLastCalledWith({
      fields: [
        {
          name: "id",
          optional: false,
          type: "string",
        },
      ],
      typeName: "UserResponse",
    }, {
      method: "GET",
      path: "/accounts",
    });

    const propertyType = screen.getByRole("button", {
      name: /^Property type 1 string$/,
    });
    fireEvent.click(propertyType);
    fireEvent.click(
      within(screen.getByRole("list", { name: /^Property type 1$/ }))
        .getByRole("button", { name: "number" }),
    );
    await waitFor(() => {
      expect(form).toBeInvalid();
      expect(responseType).toHaveValue("UserResponse");
      expect(responseType).toHaveAttribute("aria-invalid", "true");
      expect(responseTypeTemplate).toHaveTextContent(
        "New",
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This response type already uses a different schema.",
      );
    });

    fireEvent.change(responseType, {
      target: { value: "AccountResponse" },
    });
    await waitFor(() => {
      expect(form).toBeValid();
      expect(responseType).not.toHaveAttribute("aria-invalid");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    fireEvent.submit(form);
    expect(onSave).toHaveBeenLastCalledWith({
      fields: [
        { name: "id", optional: false, type: "number" },
      ],
      typeName: "AccountResponse",
    }, {
      method: "GET",
      path: "/accounts",
    });

    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    const propertyNames = screen.getAllByRole("textbox", {
      name: /^Property name /,
    });
    fireEvent.change(propertyNames[1]!, {
      target: { value: "profile" },
    });
    const propertyTypes = screen.getAllByRole("button", {
      name: /^Property type /,
    });
    fireEvent.click(propertyTypes[1]!);
    fireEvent.click(
      within(screen.getByRole("list", { name: /^Property type 2$/ }))
        .getByRole("button", { name: "object" }),
    );

    const objectTypeTemplate = screen.getByRole("button", {
      name: /^Object type template 2 New$/,
    });
    expect(screen.queryByRole("button", {
      name: "Object definition: profile",
    })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", {
      name: "Object type",
    })).not.toBeInTheDocument();
    await waitFor(() => expect(form).toBeValid());
    fireEvent.click(objectTypeTemplate);
    fireEvent.click(
      within(screen.getByRole("list", {
        name: /^Object type template 2$/,
      }))
        .getByRole("button", { name: "UserResponse" }),
    );

    await waitFor(() => {
      expect(form).toBeValid();
    });
    fireEvent.submit(form);
    expect(onSave).toHaveBeenLastCalledWith({
      fields: [
        { name: "id", optional: false, type: "number" },
        {
          name: "profile",
          objectSchema: {
            fields: [
              { name: "id", optional: false, type: "string" },
            ],
            typeName: "AccountResponseProfile",
          },
          optional: false,
          type: "object",
        },
      ],
      typeName: "AccountResponse",
    }, {
      method: "GET",
      path: "/accounts",
    });

    const objectPropertyRow = objectTypeTemplate.closest("li");
    expect(objectPropertyRow).not.toBeNull();
    expect(within(objectPropertyRow!).getByRole("button", {
      name: /^Add property 2$/,
    })).toBeInTheDocument();
    const nestedProperties = objectPropertyRow?.querySelector<HTMLElement>(
      '[data-nested-properties="true"]',
    );
    expect(nestedProperties).not.toBeNull();
    const nestedPropertyName = within(nestedProperties!).getByRole("textbox", {
      name: /^Property name 2\.1$/,
    });
    fireEvent.change(nestedPropertyName, {
      target: { value: "displayName" },
    });
    await waitFor(() => {
      expect(form).toBeValid();
      expect(objectTypeTemplate).toHaveTextContent(
        "New",
      );
    });

    expect(nestedPropertyName).toBeInTheDocument();
    expect(screen.getByRole("textbox", {
      name: "Response type",
    })).toHaveValue("AccountResponse");
  });

  it("rechecks response-schema compatibility against concurrent storage changes", async () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const routeInput = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(routeInput, { target: { value: "accounts" } });
    fireEvent.click(screen.getByRole("button", { name: "Add API route" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Add a data structure to this route",
    });
    const save = within(dialog).getByRole("button", { name: "Save" });
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Response type" }),
      { target: { value: "UserResponse" } },
    );
    await waitFor(() => expect(save).toBeEnabled());

    window.localStorage.setItem(
      apiRoutesStorage.key,
      JSON.stringify([
        { id: 0, method: "GET", path: "/accounts" },
        {
          id: 1,
          method: "GET",
          path: "/users",
          response: {
            fields: [
              { name: "id", optional: false, type: "string" },
            ],
            typeName: "UserResponse",
          },
        },
      ]),
    );
    fireEvent(
      window,
      new StorageEvent("storage", { key: apiRoutesStorage.key }),
    );
    fireEvent.click(save);

    await waitFor(() => {
      expect(dialog).toBeInTheDocument();
      expect(save).toBeDisabled();
      expect(within(dialog).getByRole("textbox", {
        name: "Response type",
      })).toHaveValue("");
      expect(within(dialog).getByRole("textbox", {
        name: "Response type",
      })).toHaveFocus();
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
      const routes = JSON.parse(
        window.localStorage.getItem(apiRoutesStorage.key) ?? "[]",
      ) as Array<{ path: string; response?: unknown }>;
      expect(routes.find(({ path }) => path === "/accounts")?.response)
        .toBeUndefined();
    });
  });

  it("preserves an edited response when a concurrent route identity wins", async () => {
    window.localStorage.setItem(
      apiRoutesStorage.key,
      JSON.stringify([
        {
          id: 4,
          method: "GET",
          path: "/users",
          response: {
            fields: [],
            typeName: "UserResponse",
          },
        },
      ]),
    );
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const routeActions = await screen.findByRole("button", {
      name: "Route actions /users",
    });
    fireEvent.click(routeActions);
    fireEvent.click(within(screen.getByRole("list", {
      name: "Route actions /users",
    })).getByRole("button", { name: "Edit /users" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Edit this route",
    });
    const routeEditor = within(dialog).getByRole("group", {
      name: "API endpoint path",
    });
    const routeInput = within(routeEditor).getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(routeInput, { target: { value: "accounts" } });
    fireEvent.click(within(routeEditor).getByRole("button", {
      name: "HTTP method GET",
    }));
    fireEvent.click(within(
      within(dialog).getByRole("list", { name: "HTTP method" }),
    ).getByRole("button", { name: "POST" }));
    const form = dialog.querySelector("form");
    if (!form) throw new Error("The edit form must be rendered.");

    window.localStorage.setItem(
      apiRoutesStorage.key,
      JSON.stringify([
        {
          id: 4,
          method: "GET",
          path: "/users",
          response: {
            fields: [],
            typeName: "UserResponse",
          },
        },
        {
          id: 9,
          method: "POST",
          path: "/accounts",
        },
      ]),
    );
    fireEvent(
      window,
      new StorageEvent("storage", { key: apiRoutesStorage.key }),
    );
    fireEvent.submit(form);

    await waitFor(() => {
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole("button", {
        name: "Save",
      })).toBeDisabled();
      expect(routeInput).toHaveFocus();
      expect(routeInput).toHaveAttribute("aria-invalid", "true");
      expect(routeInput).toHaveAccessibleDescription(
        "A leading slash is added automatically. "
        + "This HTTP method and path already exist.",
      );
      expect(within(dialog).getByRole("textbox", {
        name: "Response type",
      })).toHaveValue("UserResponse");
    });
    expect(JSON.parse(
      window.localStorage.getItem(apiRoutesStorage.key) ?? "[]",
    )).toEqual([
      {
        id: 4,
        method: "GET",
        path: "/users",
        response: {
          fields: [],
          typeName: "UserResponse",
        },
      },
      {
        id: 9,
        method: "POST",
        path: "/accounts",
      },
    ]);
  });

  it("normalizes pasted routes to lowercase letters, numbers, braces, and slashes", () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(input, {
      target: { value: "Users_2/{User-ID}.json?active=true" },
    });

    expect(input).toHaveValue("users2 / {userid}jsonactivetrue");
  });

  it("hydrates routes from local storage and persists route changes", async () => {
    window.localStorage.setItem(
      apiRoutesStorage.key,
      JSON.stringify([
        {
          id: 7,
          method: "PATCH",
          path: "/orders/{orderid}",
        },
      ]),
    );

    const firstRender = renderWithOverlay(
      <ApiCreatorStudio {...apiCreatorStudioProps} />,
    );
    const storedRoute = await screen.findByRole("listitem");
    expect(storedRoute).toHaveTextContent("PATCH");
    expect(storedRoute).toHaveTextContent("/orders/{orderid}");

    const methodTrigger = screen.getByRole("button", {
      name: "HTTP method /orders/{orderid} PATCH",
    });
    fireEvent.click(methodTrigger);
    fireEvent.click(
      within(screen.getByRole("list", {
        name: "HTTP method /orders/{orderid}",
      })).getByRole("button", { name: "DELETE" }),
    );
    await waitFor(() => {
      expect(JSON.parse(
        window.localStorage.getItem(apiRoutesStorage.key) ?? "[]",
      )).toMatchObject([{ id: 7, method: "DELETE" }]);
    });

    firstRender.unmount();
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);
    expect(await screen.findByRole("listitem")).toHaveTextContent("DELETE");

    const routeActions = screen.getByRole("button", {
      name: "Route actions /orders/{orderid}",
    });
    fireEvent.click(routeActions);
    fireEvent.click(
      within(screen.getByRole("list", {
        name: "Route actions /orders/{orderid}",
      })).getByRole("button", {
        name: "Delete /orders/{orderid}",
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("list", { name: "API routes" }),
      ).not.toBeInTheDocument();
      expect(JSON.parse(
        window.localStorage.getItem(apiRoutesStorage.key) ?? "null",
      )).toEqual([]);
    });
  });

  it("keeps volatile routes downloadable and reports the storage failure", async () => {
    browserDownloadState.downloadTextFile.mockClear();
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Storage full", "QuotaExceededError");
      });

    try {
      renderWithOverlay(
        <>
          <ApiCreatorStudio {...apiCreatorStudioProps} />
          <ApiContractsDownloadButton
            className=""
            errorLabel="Download failed"
            label="Download contracts"
          />
        </>,
      );

      const input = screen.getByRole("textbox", {
        name: "API endpoint path",
      });
      fireEvent.change(input, { target: { value: "orders/{orderid}" } });
      fireEvent.click(screen.getByRole("button", {
        name: "Add API route",
      }));

      expect(await screen.findByRole("status")).toHaveTextContent(
        "Routes are available in this tab",
      );
      const dialog = await screen.findByRole("dialog", {
        name: "Add a data structure to this route",
      });
      fireEvent(dialog, new Event("cancel", { cancelable: true }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog", {
          name: "Add a data structure to this route",
        })).not.toBeInTheDocument();
      });

      setItem.mockRestore();
      window.localStorage.setItem(
        apiRoutesStorage.key,
        JSON.stringify([
          { id: 9, method: "DELETE", path: "/peer" },
        ]),
      );
      fireEvent(
        window,
        new StorageEvent("storage", { key: apiRoutesStorage.key }),
      );
      window.localStorage.clear();
      fireEvent(
        window,
        new StorageEvent("storage", { key: null }),
      );

      expect(screen.getByRole("listitem")).toHaveTextContent(
        "/orders/{orderid}",
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Routes are available in this tab",
      );

      fireEvent.click(screen.getByRole("button", {
        name: "Download contracts",
      }));
      await waitFor(() => {
        expect(browserDownloadState.downloadTextFile).toHaveBeenCalledWith({
          contents: expect.stringContaining("GET /orders/{orderid}"),
          fileName: "api-contracts-agent-skill.md",
          mimeType: "text/markdown;charset=utf-8",
        });
      });

      const route = screen.getByRole("listitem");
      fireEvent.click(within(route).getByRole("button", {
        name: "HTTP method /orders/{orderid} GET",
      }));
      fireEvent.click(within(route).getByRole("button", { name: "POST" }));

      await waitFor(() => {
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(JSON.parse(
          window.localStorage.getItem(apiRoutesStorage.key) ?? "[]",
        )).toMatchObject([
          {
            method: "POST",
            path: "/orders/{orderid}",
          },
        ]);
      });
    } finally {
      setItem.mockRestore();
    }
  });

  it("prevents duplicate method-plus-path route identities", async () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    const addRoute = screen.getByRole("button", { name: "Add API route" });
    fireEvent.change(input, { target: { value: "users" } });
    fireEvent.click(addRoute);

    const firstDialog = await screen.findByRole("dialog", {
      name: "Add a data structure to this route",
    });
    fireEvent(firstDialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {
        name: "Add a data structure to this route",
      })).not.toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: "users" } });
    expect(addRoute).toBeDisabled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "A leading slash is added automatically. "
      + "This HTTP method and path already exist.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This HTTP method and path already exist.",
    );

    const newRouteMethod = screen.getByRole("button", {
      name: "HTTP method GET",
    });
    fireEvent.click(newRouteMethod);
    fireEvent.click(within(screen.getByRole("list", {
      name: "HTTP method",
    })).getByRole("button", { name: "POST" }));
    expect(addRoute).toBeEnabled();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription(
      "A leading slash is added automatically.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(addRoute);

    const secondDialog = await screen.findByRole("dialog", {
      name: "Add a data structure to this route",
    });
    fireEvent(secondDialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {
        name: "Add a data structure to this route",
      })).not.toBeInTheDocument();
    });

    const [getRoute] = screen.getAllByRole("listitem");
    if (!getRoute) throw new Error("The GET route must exist.");
    fireEvent.click(within(getRoute).getByRole("button", {
      name: "HTTP method /users GET",
    }));
    expect(within(getRoute).getByRole("button", {
      name: "POST",
    })).toBeDisabled();
  });

  it("auto-completes and skips a route parameter closing brace", () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", { name: "API endpoint path" });
    fireEvent.keyDown(input, { key: "{", altKey: true });

    expect(input).toHaveValue("{}");
    expect(screen.getByText("{}")).toBeInTheDocument();
    expect(input).toHaveProperty("selectionStart", 1);
    expect(input).toHaveProperty("selectionEnd", 1);

    fireEvent.keyDown(input, { key: "}", altKey: true });
    expect(input).toHaveValue("{}");
    expect(input).toHaveProperty("selectionStart", 2);
    expect(input).toHaveProperty("selectionEnd", 2);
  });

  it("submits a valid route with Enter", () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(input, { target: { value: "users/{uuid}" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByRole("listitem")).toHaveTextContent("/users/{uuid}");
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "users/{}" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(input).toHaveValue("users / {}");
  });

  it.each([
    { key: "Backspace", selection: 9 },
    { key: "Delete", selection: 8 },
  ])("removes both parameter braces with $key", ({ key, selection }) => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "users/{uuid}" } });
    input.setSelectionRange(selection, selection);
    fireEvent.keyDown(input, { key });

    expect(input).toHaveValue("users / uuid");
    expect(input).toHaveProperty("selectionStart", 8);
    expect(input).toHaveProperty("selectionEnd", 8);
  });

  it.each(["/", " "])(
    "adds a formatted route separator when pressing %s",
    (key) => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "users" } });
    input.setSelectionRange(5, 5);
    fireEvent.keyDown(input, { key });

    expect(input).toHaveValue("users / ");
    expect(input).toHaveProperty("selectionStart", 8);
    expect(input).toHaveProperty("selectionEnd", 8);
    },
  );

  it("deletes a formatted separator without getting stuck", () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "users/posts" } });
    expect(input).toHaveValue("users / posts");

    input.setSelectionRange(8, 8);
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(input).toHaveValue("usersposts");
    expect(input).toHaveProperty("selectionStart", 5);

    fireEvent.change(input, { target: { value: "users/posts" } });
    input.setSelectionRange(5, 5);
    fireEvent.keyDown(input, { key: "Delete" });
    expect(input).toHaveValue("usersposts");
    expect(input).toHaveProperty("selectionStart", 5);
  });

  it("moves Space outside a route parameter before adding a separator", () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const input = screen.getByRole("textbox", {
      name: "API endpoint path",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "users/{xxx}" } });
    expect(input).toHaveValue("users / {xxx}");
    input.setSelectionRange(12, 12);
    fireEvent.keyDown(input, { key: " " });

    expect(input).toHaveValue("users / {xxx} / ");
    expect(input).toHaveProperty("selectionStart", 16);
    expect(input).toHaveProperty("selectionEnd", 16);
  });
});

describe("site navigation", () => {
  it("replaces the add-site action with the API-contract download", async () => {
    browserDownloadState.downloadTextFile.mockClear();
    navigationState.pathname = "/en/api-creator-studio";
    render(<SiteNavigation content={getNavigationContent("en")} />);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: "API Creator Studio" })).toHaveAttribute(
      "href",
      "/en/api-creator-studio",
    );

    expect(screen.queryByRole("link", { name: "Add site" }))
      .not.toBeInTheDocument();
    const download = await screen.findByRole("button", { name: "Download" });
    expect(download.querySelector('svg[aria-hidden="true"]'))
      .toBeInTheDocument();
    fireEvent.click(download);
    await waitFor(() => {
      expect(browserDownloadState.downloadTextFile).toHaveBeenCalledWith({
        contents: expect.stringContaining("name: implement-api-contracts"),
        fileName: "api-contracts-agent-skill.md",
        mimeType: "text/markdown;charset=utf-8",
      });
    });
    expect(
      screen.getByRole("link", { name: "Lamentis home" }).querySelector('img[alt=""]'),
    ).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent(assetPath("brandMark"))),
    );
    for (const studioLink of screen.getAllByRole("link", { name: "API Creator Studio" })) {
      expect(studioLink).toHaveAttribute("aria-current", "page");
    }
  });

  it("keeps the studio download out of the mobile menu", async () => {
    browserDownloadState.downloadTextFile.mockClear();
    navigationState.pathname = "/en/api-creator-studio";
    render(<SiteNavigation content={getNavigationContent("en")} />);

    const trigger = screen.getByRole("button", {
      name: "Open primary navigation",
    });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Primary navigation",
    });
    expect(within(dialog).queryByRole("button", {
      name: "Download",
    })).not.toBeInTheDocument();
    expect(browserDownloadState.downloadTextFile).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("reports a failed API-contract download without claiming success", async () => {
    browserDownloadState.downloadTextFile.mockClear();
    browserDownloadState.downloadTextFile.mockReturnValueOnce("failed");
    navigationState.pathname = "/en/api-creator-studio";
    render(<SiteNavigation content={getNavigationContent("en")} />);

    fireEvent.click(await screen.findByRole("button", { name: "Download" }));

    expect(await screen.findByRole("button", {
      name: "Download failed",
    })).toBeInTheDocument();
  });

  it("opens an accessible mobile dialog with the same links", async () => {
    navigationState.pathname = "/en";
    render(<SiteNavigation content={getNavigationContent("en")} />);

    const trigger = screen.getByRole("button", { name: "Open primary navigation" });
    trigger.focus();
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));

    const dialog = screen.getByRole("dialog", { name: "Primary navigation" });
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Home");
    expect(dialog).toHaveTextContent("API Creator Studio");
    expect(dialog).toHaveTextContent("Add site");

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveFocus();
    });
  });

  it("marks the global add-site action as current", () => {
    navigationState.pathname = "/add-site";
    render(<SiteNavigation content={getNavigationContent("en")} />);
    expect(screen.getByRole("link", { name: "Add site" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("site footer", () => {
  it("renders the platform routes and keeps the safe external GitHub link", () => {
    navigationState.pathname = "/en";
    render(
      <SiteFooter
        content={getFooterContent("en")}
        localeSwitcher={getLocaleSwitcherModel("en")}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("href", "/en/today");
    expect(screen.getByRole("link", { name: "Legal Notice" })).toHaveAttribute(
      "href",
      "/en/legal-notice",
    );
    expect(
      screen.getByRole("link", { name: "About Me" }).querySelector('img[alt=""]'),
    ).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent(assetPath("profilePortrait"))),
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });
});

describe("locale switcher", () => {
  it("preserves a localized semantic route and closes on Escape with focus return", async () => {
    navigationState.pathname = "/en/trending";
    render(
      <LocaleSwitcher {...getLocaleSwitcherModel("en")} />,
    );

    const trigger = screen.getByRole("button", { name: "Language English" });
    fireEvent.click(trigger);
    const englishLink = screen.getByRole("link", { name: "English" });
    const germanLink = screen.getByRole("link", { name: "Deutsch" });
    expect(trigger.getAttribute("aria-controls")).toBe(germanLink.closest("ul")?.id);
    expect(englishLink).toHaveAttribute("aria-current", "page");
    expect(englishLink).toHaveAttribute("hreflang", "en");
    expect(englishLink).toHaveAttribute("lang", "en");
    expect(englishLink.querySelector("svg")).toBeInTheDocument();
    expect(germanLink).toHaveAttribute("hreflang", "de");
    expect(germanLink).toHaveAttribute("lang", "de");
    expect(germanLink.querySelector("svg")).not.toBeInTheDocument();
    expect(germanLink).toHaveAttribute(
      "href",
      "/de/trending",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => (
      expect(screen.queryByRole("link", { name: "Deutsch" })).not.toBeInTheDocument()
    ));
    expect(trigger).toHaveFocus();
  });
});
