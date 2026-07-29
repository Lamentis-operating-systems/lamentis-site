import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { EmptyPage } from "@/components/site/empty-page";
import { LocaleSwitcher } from "@/components/site/footer/locale-switcher";
import { SiteFooter } from "@/components/site/footer/site-footer";
import { JsonLd } from "@/components/site/json-ld";
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
  highlightBracedInput: true,
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

describe("empty pages", () => {
  it("keeps an accessible main landmark without visible placeholder content", () => {
    render(<EmptyPage label="Today" />);
    const main = screen.getByRole("main", { name: "Today" });
    expect(main).toBeEmptyDOMElement();
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
});

describe("search page", () => {
  it("renders an accessible inert search field without action controls", () => {
    renderWithOverlay(
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

  it("selects an HTTP method from an accessible overlay", async () => {
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);

    const trigger = screen.getByRole("button", { name: "HTTP method" });
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
    expect(screen.queryByRole("list", { name: "HTTP method" })).not.toBeInTheDocument();

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
      name: "Add response",
    });
    const responsePanel = responseDialog.querySelector("section");
    expect(responseDialog).toHaveAttribute("data-placement", "bottom-right");
    expect(responsePanel?.style.getPropertyValue("--overlay-width")).toBe(
      "40rem",
    );
    expect(responsePanel?.style.getPropertyValue("--overlay-height")).toBe(
      "40rem",
    );
    expect(responseDialog.querySelector("header")).toHaveTextContent(
      "Add response",
    );
    expect(responseDialog.querySelector("footer")).toHaveTextContent("Save");
    expect(responseDialog).toHaveFocus();

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

    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    await waitFor(() => expect(saveResponse).toBeDisabled());

    fireEvent.change(
      screen.getByRole("textbox", { name: "Property name" }),
      { target: { value: "items" } },
    );
    await waitFor(() => expect(saveResponse).toBeEnabled());

    fireEvent.change(
      screen.getByRole("combobox", { name: "Property type" }),
      { target: { value: "array" } },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Array item type" }),
      { target: { value: "object" } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Optional" }));
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Response type" }),
      { key: "Enter" },
    );
    expect(responseDialog).toHaveAttribute("data-state", "closing");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Add response" }),
      ).not.toBeInTheDocument();
    });

    const route = screen.getByRole("listitem");
    expect(screen.getByRole("list", { name: "API routes" })).toContainElement(
      route,
    );
    expect(route).toHaveTextContent("POST");
    expect(route).toHaveTextContent("/users/{uuid}/posts");
    expect(route).toHaveTextContent("Response type: UserResponse");
    expect(screen.queryByText("Method")).not.toBeInTheDocument();
    expect(screen.queryByText("Route")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(JSON.parse(
        window.localStorage.getItem(apiRoutesStorage.key) ?? "[]",
      )).toMatchObject([
        {
          method: "POST",
          path: "/users/{uuid}/posts",
          response: { typeName: "UserResponse" },
        },
      ]);
    });

    const savedMethod = screen.getByRole("button", {
      name: "HTTP method /users/{uuid}/posts",
    });
    expect(savedMethod).toHaveTextContent("POST");
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
    expect(editDialog.querySelector("section > div")).toBeEmptyDOMElement();
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
  });

  it("normalizes pasted routes to lowercase letters, numbers, braces, and slashes", () => {
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);

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
      <SearchPage {...apiCreatorStudioProps} />,
    );
    const storedRoute = await screen.findByRole("listitem");
    expect(storedRoute).toHaveTextContent("PATCH");
    expect(storedRoute).toHaveTextContent("/orders/{orderid}");

    const methodTrigger = screen.getByRole("button", {
      name: "HTTP method /orders/{orderid}",
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
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);
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

  it("auto-completes and skips a route parameter closing brace", () => {
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);

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
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);

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
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);

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
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);

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
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);

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
    renderWithOverlay(<SearchPage {...apiCreatorStudioProps} />);

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
  it("replaces the add-site action with the API-contract download", () => {
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
    const download = screen.getByRole("button", { name: "Download" });
    expect(download.querySelector('svg[aria-hidden="true"]'))
      .toBeInTheDocument();
    fireEvent.click(download);
    expect(browserDownloadState.downloadTextFile).toHaveBeenCalledWith({
      contents: expect.stringContaining("name: implement-api-contracts"),
      fileName: "api-contracts-agent-skill.md",
      mimeType: "text/markdown;charset=utf-8",
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

  it("downloads from the mobile studio action and closes the menu", async () => {
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
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Download" }),
    );

    expect(browserDownloadState.downloadTextFile).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("opens an accessible mobile dialog with the same links", async () => {
    navigationState.pathname = "/en";
    render(<SiteNavigation content={getNavigationContent("en")} />);

    const trigger = screen.getByRole("button", { name: "Open primary navigation" });
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));

    const dialog = screen.getByRole("dialog", { name: "Primary navigation" });
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Home");
    expect(dialog).toHaveTextContent("API Creator Studio");
    expect(dialog).toHaveTextContent("Add site");
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

    const trigger = screen.getByRole("button", { name: "Language" });
    fireEvent.click(trigger);
    const englishLink = screen.getByRole("link", { name: "English" });
    const germanLink = screen.getByRole("link", { name: "Deutsch" });
    expect(trigger.getAttribute("aria-controls")).toBe(germanLink.closest("ul")?.id);
    expect(englishLink).toHaveAttribute("aria-current", "page");
    expect(englishLink.querySelector("svg")).toBeInTheDocument();
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
