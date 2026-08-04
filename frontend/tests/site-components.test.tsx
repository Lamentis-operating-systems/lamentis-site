import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState, type ComponentProps, type ReactNode } from "react";
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

function objectSchemaJson(
  properties: Record<string, unknown>,
  required: string[] = Object.keys(properties),
): string {
  return JSON.stringify({
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  });
}

function formattedObjectSchemaJson(
  properties: Record<string, unknown>,
  required: string[] = Object.keys(properties),
): string {
  return JSON.stringify(JSON.parse(objectSchemaJson(properties, required)), null, 2);
}

const emptyObjectSchemaStarter = [
  "{",
  '  "type": "object",',
  '  "properties": {',
  "    ",
  "  }",
  "}",
].join("\n");

function renderResponseEditor(
  props: Pick<
    ComponentProps<typeof ResponseSchemaEditor>,
    "formId" | "onSave" | "route"
  >,
) {
  return render(
    <ResponseSchemaEditor
      {...props}
      content={apiCreatorStudioProps.responseEditor}
      getRouteValidationReason={() => null}
      routeInputContent={{
        duplicatePathError: apiCreatorStudioProps.duplicatePathError,
        invalidPathError: apiCreatorStudioProps.invalidPathError,
        label: apiCreatorStudioProps.label,
        methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
        pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
        placeholder: apiCreatorStudioProps.placeholder,
      }}
    />,
  );
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
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
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

  it("creates and edits a route with common JSON Schema authoring", async () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const method = screen.getByRole("button", { name: "HTTP method GET" });
    fireEvent.click(method);
    fireEvent.click(within(screen.getByRole("list", {
      name: "HTTP method",
    })).getByRole("button", { name: "POST" }));

    const pathInput = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(pathInput, { target: { value: "users/{uuid}/posts" } });
    fireEvent.click(screen.getByRole("button", { name: "Add API route" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Define this API route",
    });
    expect(within(dialog).getByRole("button", {
      name: "Advanced settings",
    })).toHaveAttribute("aria-expanded", "false");
    expect(within(dialog).queryByRole("textbox", {
      name: "Response type",
    })).not.toBeInTheDocument();
    const requestSchema = within(dialog).getByRole("textbox", {
      name: "Request type (JSON Schema)",
    });
    const responseSchema = within(dialog).getByRole("textbox", {
      name: "Response type (JSON Schema)",
    });
    expect(requestSchema).toBeVisible();
    expect(responseSchema).toBeVisible();
    expect(responseSchema).toHaveValue(emptyObjectSchemaStarter);
    expect(within(dialog).getByRole("checkbox", {
      name: "Paginated response",
    })).toHaveAccessibleDescription(
      "Wraps this type in items and adds totalHits, page, limit, and totalPages when exported.",
    );
    expect(within(dialog).queryByRole("checkbox", {
      name: "Paginated response 1",
    })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Add query parameter",
    }));
    const parameterNames = within(dialog).getAllByRole("textbox", {
      name: /Parameter name/,
    });
    fireEvent.change(parameterNames.at(-1)!, {
      target: { value: "limit" },
    });
    const parameterTypeButtons = within(dialog).getAllByRole("button", {
      name: /Parameter type .* string/,
    });
    fireEvent.click(parameterTypeButtons.at(-1)!);
    fireEvent.click(within(within(dialog).getByRole("list", {
      name: /Parameter type 2/,
    })).getByRole("button", { name: "integer" }));
    const requiredParameters = within(dialog).getAllByRole("checkbox", {
      name: "Required",
    });
    fireEvent.click(requiredParameters.at(-1)!);

    const routeGroup = within(dialog).getByRole("group", {
      name: "API endpoint path",
    });
    fireEvent.click(within(routeGroup).getByRole("button", {
      name: "HTTP method POST",
    }));
    fireEvent.click(within(within(dialog).getByRole("list", {
      name: "HTTP method",
    })).getByRole("button", { name: "PATCH" }));
    fireEvent.change(requestSchema, {
      target: { value: objectSchemaJson({ title: { type: "string" } }) },
    });
    fireEvent.change(responseSchema, {
      target: {
        value: objectSchemaJson({
          id: { type: "string" },
          published: { type: "boolean" },
        }),
      },
    });
    fireEvent.click(within(dialog).getByRole("checkbox", {
      name: "Paginated response",
    }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", {
        name: "Define this API route",
      })).not.toBeInTheDocument();
    });
    const route = screen.getByRole("listitem");
    expect(route).toHaveTextContent("PATCH");
    expect(route).toHaveTextContent("/users/{uuid}/posts");
    expect(route).toHaveTextContent(
      "Response type: PatchUsersByUuidPostsResponse",
    );
    expect(JSON.parse(
      window.localStorage.getItem(apiRoutesStorage.key) ?? "[]",
    )).toMatchObject([{
      method: "PATCH",
      paginated: true,
      path: "/users/{uuid}/posts",
      requestBody: {
        contentTypes: ["application/json"],
        required: true,
        schema: {
          fields: [{ name: "title", optional: false, type: "string" }],
          typeName: "PatchUsersByUuidPostsRequest",
        },
      },
      parameters: [
        expect.objectContaining({
          location: "path",
          name: "uuid",
          required: true,
          type: "string",
        }),
        expect.objectContaining({
          location: "query",
          name: "limit",
          required: true,
          type: "integer",
        }),
      ],
      response: {
        fields: [
          { name: "id", optional: false, type: "string" },
          { name: "published", optional: false, type: "boolean" },
        ],
        typeName: "PatchUsersByUuidPostsResponse",
      },
      responses: [{
        contentTypes: ["application/json"],
        paginated: true,
        schema: {
          fields: [
            { name: "id", optional: false, type: "string" },
            { name: "published", optional: false, type: "boolean" },
          ],
          typeName: "PatchUsersByUuidPostsResponse",
        },
        status: "200",
      }],
    }]);
  });

  it("seeds only create-mode responses and keeps the draft through 204", () => {
    const onSave = vi.fn(() => "saved" as const);
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="seeded-response-form"
        getRouteValidationReason={() => null}
        initializeEmptyResponseSchema
        onSave={onSave}
        route={{ id: 30, method: "GET", path: "/seeded" }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    expect(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    })).toHaveValue(emptyObjectSchemaStarter);
    fireEvent.click(screen.getByRole("button", { name: "HTTP method GET" }));
    fireEvent.click(within(screen.getByRole("list", {
      name: "HTTP method",
    })).getByRole("button", { name: "DELETE" }));
    expect(screen.getByRole("textbox", { name: "HTTP status" }))
      .toHaveValue("204");
    expect(screen.queryByRole("textbox", {
      name: "Response type (JSON Schema)",
    })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", {
      name: "Paginated response",
    })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "HTTP method DELETE" }));
    fireEvent.click(within(screen.getByRole("list", {
      name: "HTTP method",
    })).getByRole("button", { name: "GET" }));
    expect(screen.getByRole("textbox", { name: "HTTP status" }))
      .toHaveValue("200");
    expect(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    })).toHaveValue(emptyObjectSchemaStarter);

    fireEvent.submit(document.querySelector("#seeded-response-form")!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      response: {
        fields: [],
        typeName: "GetSeededResponse",
      },
      responses: [expect.objectContaining({
        schema: {
          fields: [],
          typeName: "GetSeededResponse",
        },
        status: "200",
      })],
    }), { method: "GET", path: "/seeded" });
  });

  it("leaves existing empty routes unseeded", () => {
    renderResponseEditor({
      formId: "existing-empty-response-form",
      onSave: vi.fn(() => "saved" as const),
      route: { id: 31, method: "GET", path: "/existing" },
    });

    expect(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    })).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Paginated response" }))
      .toBeDisabled();
  });

  it("rejects invalid and unsupported schemas and focuses the field", async () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const method = screen.getByRole("button", { name: "HTTP method GET" });
    fireEvent.click(method);
    fireEvent.click(within(screen.getByRole("list", {
      name: "HTTP method",
    })).getByRole("button", { name: "POST" }));
    const routeInput = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(routeInput, { target: { value: "users" } });
    fireEvent.click(screen.getByRole("button", { name: "Add API route" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Define this API route",
    });
    const responseSchema = within(dialog).getByRole("textbox", {
      name: "Response type (JSON Schema)",
    });
    fireEvent.change(responseSchema, { target: { value: '{"type":' } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "Enter a complete JSON Schema object before saving.",
      );
      expect(responseSchema).toHaveAttribute("aria-invalid", "true");
      expect(responseSchema).toHaveFocus();
    });

    fireEvent.change(responseSchema, { target: { value: '{"id":"string"}' } });
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "Unsupported schema. Use an object with type, properties, required, and items.",
      );
      expect(responseSchema).toHaveFocus();
    });

    fireEvent.change(responseSchema, {
      target: { value: objectSchemaJson({ id: { type: "string" } }) },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("listitem")).toHaveTextContent(
      "Response type: PostUsersResponse",
    ));
  });

  it("saves nested schemas and keeps examples independent", () => {
    const onSave = vi.fn(() => "saved" as const);
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="json-contract-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{ id: 12, method: "POST", path: "/search" }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", {
      name: "Request type (JSON Schema)",
    }), {
      target: {
        value: objectSchemaJson({
          query: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                score: { type: "number" },
              },
              required: ["id"],
            },
          },
        }),
      },
    });
    fireEvent.change(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    }), {
      target: {
        value: objectSchemaJson({
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                "display-name": { type: "string" },
              },
              required: ["id", "display-name"],
            },
          },
        }),
      },
    });
    const advancedToggle = screen.getByRole("button", {
      name: "Advanced settings",
    });
    fireEvent.click(advancedToggle);
    const requestExample = screen.getByRole("textbox", {
      name: "Request example (JSON)",
    });
    fireEvent.change(requestExample, { target: { value: '{"query":' } });
    fireEvent.click(screen.getByRole("button", {
      name: "Format JSON: Request example (JSON)",
    }));
    expect(requestExample).toHaveAttribute("aria-invalid", "true");
    fireEvent.click(advancedToggle);
    expect(advancedToggle).toHaveAttribute("aria-expanded", "true");
    expect(requestExample).toHaveFocus();
    fireEvent.change(requestExample, {
      target: {
        value: '{"query":"docs","items":[{"id":"a"},{"id":"b","score":2}]}',
      },
    });
    fireEvent.change(screen.getByRole("textbox", {
      name: "Response example (JSON)",
    }), {
      target: { value: '{"results":[{"id":"a","display-name":"Ada"}]}' },
    });
    fireEvent.submit(document.querySelector("#json-contract-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      operationId: "createSearch",
      parameters: [],
      request: expect.objectContaining({
        fields: [
          { name: "query", optional: false, type: "string" },
          expect.objectContaining({
            arrayItemType: "object",
            name: "items",
            optional: false,
            type: "array",
          }),
        ],
        typeName: "PostSearchRequest",
      }),
      requestBody: expect.objectContaining({
        example: {
          items: [{ id: "a" }, { id: "b", score: 2 }],
          query: "docs",
        },
        required: true,
      }),
      response: expect.objectContaining({
        fields: [expect.objectContaining({
          arrayItemType: "object",
          name: "results",
          optional: false,
          type: "array",
        })],
        typeName: "PostSearchResponse",
      }),
      responses: [expect.objectContaining({
        example: {
          results: [{ id: "a", "display-name": "Ada" }],
        },
        status: "201",
      })],
      title: "Create search",
    }), { method: "POST", path: "/search" });
  });

  it("saves explicit advanced overrides and an additional error response", () => {
    const onSave = vi.fn(() => "saved" as const);
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="advanced-contract-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{ id: 14, method: "POST", path: "/sessions" }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Advanced settings",
    }));
    expect(screen.getByRole("button", {
      name: "Advanced settings",
    })).toHaveAttribute("aria-expanded", "true");

    fireEvent.change(screen.getByRole("textbox", { name: "Summary" }), {
      target: { value: "Create a session" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Tags" }), {
      target: { value: "sessions, auth" },
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Route authentication Use API default",
    }));
    fireEvent.click(within(screen.getByRole("list", {
      name: "Route authentication",
    })).getByRole("button", { name: "No authentication" }));

    fireEvent.click(screen.getByRole("button", {
      name: "Add header or cookie parameter",
    }));
    fireEvent.change(screen.getByRole("textbox", {
      name: "Parameter name 1",
    }), { target: { value: "X-Request-ID" } });

    fireEvent.click(screen.getByRole("button", { name: "Add response" }));
    fireEvent.change(screen.getByRole("textbox", {
      name: "Response type (JSON Schema) 2",
    }), {
      target: { value: objectSchemaJson({ code: { type: "string" } }) },
    });
    fireEvent.change(screen.getByRole("textbox", {
      name: "Response example (JSON) 2",
    }), { target: { value: '{"code":"invalid"}' } });
    expect(screen.queryByRole("checkbox", {
      name: "Paginated response 1",
    })).not.toBeInTheDocument();
    const additionalPagination = screen.getByRole("checkbox", {
      name: "Paginated response 2",
    });
    expect(additionalPagination).toBeEnabled();
    fireEvent.click(additionalPagination);
    fireEvent.submit(document.querySelector("#advanced-contract-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      parameters: [expect.objectContaining({
        location: "header",
        name: "X-Request-ID",
        required: false,
        type: "string",
      })],
      responses: [
        expect.objectContaining({ status: "201" }),
        expect.objectContaining({
          description: "Error response",
          example: { code: "invalid" },
          paginated: true,
          schema: expect.objectContaining({
            typeName: "PostSessionsResponse400",
          }),
          status: "400",
        }),
      ],
      security: { scheme: "none" },
      tags: ["sessions", "auth"],
      title: "Create a session",
    }), { method: "POST", path: "/sessions" });
    expect(onSave).toHaveBeenCalledWith(expect.not.objectContaining({
      paginated: expect.anything(),
    }), expect.anything());
  });

  it("preserves existing hidden contract details while simplifying the editor", () => {
    const onSave = vi.fn(() => "saved" as const);
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="legacy-contract-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{
          behavior: { cache: "private", rateLimit: "100/min" },
          id: 13,
          method: "HEAD",
          paginated: true,
          path: "/sessions",
          response: {
            fields: [{
              name: "id",
              optional: false,
              type: "string",
            }],
            typeName: "LegacySessionResponse",
          },
          responses: [{
            contentTypes: ["application/json"],
            description: "Successful response",
            status: "200",
          }],
          security: {
            scheme: "bearer",
            scopes: ["legacy:read"],
          },
          tags: ["sessions"],
        }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    expect(screen.getByRole("button", {
      name: "Advanced settings",
    })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("API details")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", {
      name: "Request type (JSON Schema)",
    }))
      .not.toBeInTheDocument();
    fireEvent.submit(document.querySelector("#legacy-contract-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      behavior: { cache: "private", rateLimit: "100/min" },
      paginated: true,
      response: {
        fields: [{
          name: "id",
          optional: false,
          type: "string",
        }],
        typeName: "LegacySessionResponse",
      },
      security: {
        scheme: "bearer",
        scopes: ["legacy:read"],
      },
      tags: ["sessions"],
    }), { method: "HEAD", path: "/sessions" });
  });

  it("preserves legacy response mirrors across a successful status edit", () => {
    const onSave = vi.fn(() => "saved" as const);
    const schema = {
      fields: [{ name: "id", optional: false, type: "string" as const }],
      typeName: "LegacySessionResponse",
    };
    renderResponseEditor({
      formId: "legacy-status-form",
      onSave,
      route: {
        id: 21,
        method: "HEAD",
        paginated: true,
        path: "/sessions",
        response: schema,
        responses: [{
          contentTypes: ["application/json"],
          description: "Successful response",
          status: "200",
        }],
      },
    });

    expect(screen.getByRole("button", { name: "Advanced settings" }))
      .toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("checkbox", { name: "Paginated response" }))
      .toBeChecked();
    fireEvent.change(screen.getByRole("textbox", { name: "HTTP status" }), {
      target: { value: "201" },
    });
    fireEvent.submit(document.querySelector("#legacy-status-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      paginated: true,
      response: schema,
      responses: [{
        contentTypes: ["application/json"],
        description: "Successful response",
        status: "201",
      }],
    }), { method: "HEAD", path: "/sessions" });
  });

  it("removes legacy response mirrors when its status becomes no-content", () => {
    const onSave = vi.fn(() => "saved" as const);
    const schema = {
      fields: [{ name: "id", optional: false, type: "string" as const }],
      typeName: "LegacySessionResponse",
    };
    renderResponseEditor({
      formId: "legacy-no-content-form",
      onSave,
      route: {
        id: 22,
        method: "HEAD",
        paginated: true,
        path: "/sessions",
        response: schema,
        responses: [{
          contentTypes: ["application/json"],
          description: "Successful response",
          status: "200",
        }],
      },
    });

    fireEvent.change(screen.getByRole("textbox", { name: "HTTP status" }), {
      target: { value: "204" },
    });
    fireEvent.submit(document.querySelector("#legacy-no-content-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      responses: [{
        contentTypes: [],
        description: "Successful response",
        status: "204",
      }],
    }), { method: "HEAD", path: "/sessions" });
    expect(onSave).toHaveBeenCalledWith(expect.not.objectContaining({
      paginated: expect.anything(),
    }), expect.anything());
    expect(onSave).toHaveBeenCalledWith(expect.not.objectContaining({
      response: expect.anything(),
    }), expect.anything());
  });

  it("keeps a reformatted legacy request optional and mirror-free", () => {
    const onSave = vi.fn(() => "saved" as const);
    const schema = {
      fields: [
        { name: "id", optional: false, type: "string" as const },
        { name: "name", optional: false, type: "string" as const },
      ],
      typeName: "LegacyRequest",
    };
    renderResponseEditor({
      formId: "legacy-request-form",
      onSave,
      route: {
        id: 23,
        method: "POST",
        path: "/sessions",
        request: schema,
      },
    });

    expect(screen.getByRole("checkbox", { name: "Request body required" }))
      .not.toBeChecked();
    fireEvent.change(screen.getByRole("textbox", {
      name: "Request type (JSON Schema)",
    }), {
      target: {
        value: objectSchemaJson({
          name: { type: "string" },
          id: { type: "string" },
        }, ["name", "id"]),
      },
    });
    fireEvent.submit(document.querySelector("#legacy-request-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      request: schema,
    }), { method: "POST", path: "/sessions" });
    expect(onSave).toHaveBeenCalledWith(expect.not.objectContaining({
      requestBody: expect.anything(),
    }), expect.anything());
  });

  it("keeps a reformatted response schema out of the legacy mirror", () => {
    const onSave = vi.fn(() => "saved" as const);
    const schema = {
      fields: [
        { name: "id", optional: false, type: "string" as const },
        { name: "name", optional: false, type: "string" as const },
      ],
      typeName: "SessionResponse",
    };
    renderResponseEditor({
      formId: "response-reformat-form",
      onSave,
      route: {
        id: 24,
        method: "GET",
        path: "/sessions",
        responses: [{
          contentTypes: ["application/json"],
          description: "Successful response",
          schema,
          status: "200",
        }],
      },
    });

    fireEvent.change(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    }), {
      target: {
        value: objectSchemaJson({
          name: { type: "string" },
          id: { type: "string" },
        }, ["name", "id"]),
      },
    });
    fireEvent.submit(document.querySelector("#response-reformat-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      responses: [expect.objectContaining({ schema })],
    }), { method: "GET", path: "/sessions" });
    expect(onSave).toHaveBeenCalledWith(expect.not.objectContaining({
      response: expect.anything(),
    }), expect.anything());
  });

  it("materializes a visible legacy response schema when enabling pagination", () => {
    const onSave = vi.fn(() => "saved" as const);
    const schema = {
      fields: [{ name: "id", optional: false, type: "string" as const }],
      typeName: "LegacySessionResponse",
    };
    renderResponseEditor({
      formId: "legacy-pagination-form",
      onSave,
      route: {
        id: 25,
        method: "GET",
        path: "/sessions",
        response: schema,
        responses: [{
          contentTypes: ["application/json"],
          description: "Successful response",
          status: "200",
        }],
      },
    });

    const pagination = screen.getByRole("checkbox", {
      name: "Paginated response",
    });
    fireEvent.click(pagination);
    const responseSchema = screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    });
    fireEvent.change(responseSchema, { target: { value: "" } });
    expect(pagination).not.toBeChecked();
    expect(pagination).toBeDisabled();
    fireEvent.change(responseSchema, {
      target: { value: objectSchemaJson({ id: { type: "string" } }) },
    });
    expect(pagination).toBeEnabled();
    fireEvent.click(pagination);
    fireEvent.submit(document.querySelector("#legacy-pagination-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      paginated: true,
      response: schema,
      responses: [expect.objectContaining({
        paginated: true,
        schema,
      })],
    }), { method: "GET", path: "/sessions" });
  });

  it("materializes a visible legacy request schema with new body settings", () => {
    const onSave = vi.fn(() => "saved" as const);
    const schema = {
      fields: [{ name: "id", optional: false, type: "string" as const }],
      typeName: "LegacyRequest",
    };
    renderResponseEditor({
      formId: "legacy-request-settings-form",
      onSave,
      route: {
        id: 26,
        method: "POST",
        path: "/sessions",
        request: schema,
      },
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Request body required" }));
    fireEvent.submit(document.querySelector("#legacy-request-settings-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      request: schema,
      requestBody: {
        contentTypes: ["application/json"],
        required: true,
        schema,
      },
    }), { method: "POST", path: "/sessions" });
  });

  it("removes only the response type when its schema input is cleared", () => {
    const onSave = vi.fn(() => "saved" as const);
    const schema = {
      fields: [{ name: "id", optional: false, type: "string" as const }],
      typeName: "ProfileResponse",
    };
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="clear-schema-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{
          id: 18,
          method: "GET",
          path: "/profiles/{id}",
          response: schema,
          responses: [{
            contentTypes: ["application/json"],
            description: "Successful response",
            example: { id: "profile_1" },
            schema,
            status: "200",
          }],
        }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    }), { target: { value: "" } });
    fireEvent.submit(document.querySelector("#clear-schema-form")!);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        responses: [{
          contentTypes: ["application/json"],
          description: "Successful response",
          example: { id: "profile_1" },
          status: "200",
        }],
      }),
      { method: "GET", path: "/profiles/{id}" },
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.not.objectContaining({ response: expect.anything() }),
      expect.anything(),
    );
  });

  it("changes an Advanced example without rewriting its schema", () => {
    const onSave = vi.fn(() => "saved" as const);
    const schema = {
      fields: [{
        description: "Stable identifier",
        maxLength: 40,
        name: "id",
        optional: false,
        type: "string" as const,
      }],
      typeName: "ProfileResponse",
    };
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="example-only-edit-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{
          id: 19,
          method: "GET",
          path: "/profiles",
          responses: [{
            contentTypes: ["application/json"],
            description: "Successful response",
            example: { id: "profile_1" },
            schema,
            status: "200",
          }],
        }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Advanced settings",
    }));
    fireEvent.change(screen.getByRole("textbox", {
      name: "Response example (JSON)",
    }), { target: { value: '{"id":"profile_2"}' } });
    fireEvent.submit(document.querySelector("#example-only-edit-form")!);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        responses: [expect.objectContaining({
          example: { id: "profile_2" },
          schema,
        })],
      }),
      { method: "GET", path: "/profiles" },
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.not.objectContaining({ response: expect.anything() }),
      expect.anything(),
    );
  });

  it("keeps an example-only legacy response schema-less", () => {
    const onSave = vi.fn(() => "saved" as const);
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="example-only-legacy-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{
          id: 20,
          method: "GET",
          path: "/legacy-example",
          responses: [{
            contentTypes: ["application/json"],
            description: "Successful response",
            example: { id: "legacy_1" },
            status: "200",
          }],
        }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    expect(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    })).toHaveValue("");
    fireEvent.click(screen.getByRole("button", {
      name: "Advanced settings",
    }));
    expect(screen.getByRole("textbox", { name: "Response example (JSON)" }))
      .toHaveValue('{\n  "id": "legacy_1"\n}');
    fireEvent.submit(document.querySelector("#example-only-legacy-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      responses: [{
        contentTypes: ["application/json"],
        description: "Successful response",
        example: { id: "legacy_1" },
        status: "200",
      }],
    }), { method: "GET", path: "/legacy-example" });
  });

  it("keeps an existing response payload when the method suggests no content", () => {
    const onSave = vi.fn(() => "saved" as const);
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="method-change-contract-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{
          id: 16,
          method: "GET",
          path: "/sessions/{id}",
          responses: [{
            contentTypes: ["application/json"],
            description: "Successful response",
            example: { id: "session_1" },
            schema: {
              fields: [{
                name: "id",
                optional: false,
                type: "string",
              }],
              typeName: "SessionResponse",
            },
            status: "200",
          }],
        }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "HTTP method GET" }));
    fireEvent.click(within(screen.getByRole("list", {
      name: "HTTP method",
    })).getByRole("button", { name: "DELETE" }));

    expect(screen.getByRole("textbox", { name: "HTTP status" }))
      .toHaveValue("200");
    expect(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    })).toHaveValue(formattedObjectSchemaJson({ id: { type: "string" } }));
    fireEvent.click(screen.getByRole("button", {
      name: "Advanced settings",
    }));
    expect(screen.getByRole("textbox", { name: "Response example (JSON)" }))
      .toHaveValue('{\n  "id": "session_1"\n}');
    fireEvent.submit(document.querySelector("#method-change-contract-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      responses: [expect.objectContaining({
        example: { id: "session_1" },
        schema: expect.objectContaining({ typeName: "SessionResponse" }),
        status: "200",
      })],
    }), { method: "DELETE", path: "/sessions/{id}" });
  });

  it("keeps a non-first success response as the stable common response", () => {
    const onSave = vi.fn(() => "saved" as const);
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="response-order-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{
          id: 15,
          method: "GET",
          path: "/sessions",
          responses: [
            {
              contentTypes: ["application/json"],
              description: "Unauthorized",
              example: { code: "unauthorized" },
              schema: {
                fields: [{
                  name: "code",
                  optional: false,
                  type: "string",
                }],
                typeName: "ErrorResponse",
              },
              status: "401",
            },
            {
              contentTypes: ["application/json"],
              description: "Successful response",
              example: { id: "session_1" },
              schema: {
                fields: [{
                  name: "id",
                  optional: false,
                  type: "string",
                }],
                typeName: "SessionResponse",
              },
              status: "200",
            },
          ],
        }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    expect(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    })).toHaveValue(formattedObjectSchemaJson({ id: { type: "string" } }));
    fireEvent.click(screen.getByRole("button", {
      name: "Advanced settings",
    }));
    expect(screen.getByRole("textbox", { name: "Response example (JSON)" }))
      .toHaveValue('{\n  "id": "session_1"\n}');
    fireEvent.submit(document.querySelector("#response-order-form")!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      responses: [
        expect.objectContaining({ status: "401" }),
        expect.objectContaining({
          schema: expect.objectContaining({ typeName: "SessionResponse" }),
          status: "200",
        }),
      ],
    }), { method: "GET", path: "/sessions" });
    expect(onSave).toHaveBeenCalledWith(
      expect.not.objectContaining({ response: expect.anything() }),
      expect.anything(),
    );
  });

  it("supports a compact no-content response without a body editor", () => {
    const onSave = vi.fn(() => "saved" as const);
    render(
      <ResponseSchemaEditor
        content={apiCreatorStudioProps.responseEditor}
        formId="no-content-form"
        getRouteValidationReason={() => null}
        onSave={onSave}
        route={{ id: 11, method: "GET", path: "/health" }}
        routeInputContent={{
          duplicatePathError: apiCreatorStudioProps.duplicatePathError,
          invalidPathError: apiCreatorStudioProps.invalidPathError,
          label: apiCreatorStudioProps.label,
          methodSelectorLabel: apiCreatorStudioProps.methodSelectorLabel,
          pathPrefixHint: apiCreatorStudioProps.pathPrefixHint,
          placeholder: apiCreatorStudioProps.placeholder,
        }}
      />,
    );

    const responseSchema = screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    });
    const schemaValue = objectSchemaJson({ ok: { type: "boolean" } });
    fireEvent.change(responseSchema, { target: { value: schemaValue } });
    fireEvent.change(screen.getByRole("textbox", { name: "HTTP status" }), {
      target: { value: "204" },
    });
    expect(screen.queryByRole("textbox", {
      name: "Response type (JSON Schema)",
    }))
      .not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "HTTP status" }), {
      target: { value: "200" },
    });
    expect(screen.getByRole("textbox", {
      name: "Response type (JSON Schema)",
    })).toHaveValue(schemaValue);
    fireEvent.change(screen.getByRole("textbox", { name: "HTTP status" }), {
      target: { value: "204" },
    });

    fireEvent.submit(document.querySelector("#no-content-form")!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      responses: [{
        contentTypes: [],
        description: "Successful response",
        status: "204",
      }],
    }), { method: "GET", path: "/health" });
  });
  it("rechecks inferred-schema compatibility against concurrent storage changes", async () => {
    renderWithOverlay(<ApiCreatorStudio {...apiCreatorStudioProps} />);

    const routeInput = screen.getByRole("textbox", {
      name: "API endpoint path",
    });
    fireEvent.change(routeInput, { target: { value: "accounts" } });
    fireEvent.click(screen.getByRole("button", { name: "Add API route" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Define this API route",
    });
    const responseSchema = within(dialog).getByRole("textbox", {
      name: "Response type (JSON Schema)",
    });
    fireEvent.change(responseSchema, {
      target: { value: objectSchemaJson({ name: { type: "string" } }) },
    });

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
            typeName: "GetAccountsResponse",
          },
        },
      ]),
    );
    fireEvent(
      window,
      new StorageEvent("storage", { key: apiRoutesStorage.key }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "This route conflicts with an existing generated type.",
      );
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
        name: "Response type (JSON Schema)",
      })).toHaveValue(formattedObjectSchemaJson({}, []));
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
        name: "Define this API route",
      });
      fireEvent(dialog, new Event("cancel", { cancelable: true }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog", {
          name: "Define this API route",
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
      name: "Define this API route",
    });
    fireEvent(firstDialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {
        name: "Define this API route",
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
      name: "Define this API route",
    });
    fireEvent(secondDialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {
        name: "Define this API route",
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
