import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyPage } from "@/components/site/empty-page";
import { LocaleSwitcher } from "@/components/site/footer/locale-switcher";
import { SiteFooter } from "@/components/site/footer/site-footer";
import { JsonLd } from "@/components/site/json-ld";
import { SiteNavigation } from "@/components/site/navigation/site-navigation";
import { SearchPage } from "@/components/site/search-page";
import {
  getFooterContent,
  getLocaleSwitcherModel,
  getNavigationContent,
} from "@/domain/site/content";
import { assetPath } from "@/domain/site/assets";

const navigationState = vi.hoisted(() => ({ pathname: "/en" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

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

describe("search page", () => {
  it("renders an accessible inert search field without action controls", () => {
    render(
      <SearchPage
        heading="Search sites"
        label="Search"
        placeholder="Search"
      />,
    );

    const main = screen.getByRole("main", { name: "Search" });
    const search = screen.getByRole("search", { name: "Search" });
    const input = screen.getByRole("searchbox", { name: "Search" });

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
});

describe("site navigation", () => {
  it("renders the canonical platform links and the plus action", () => {
    navigationState.pathname = "/en/today";
    render(<SiteNavigation content={getNavigationContent("en")} />);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("href", "/en/today");
    expect(screen.getByRole("link", { name: "Trending" })).toHaveAttribute("href", "/en/trending");
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/en/search");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/en");

    const addSite = screen.getByRole("link", { name: "Add site" });
    expect(addSite).toHaveAttribute("href", "/add-site");
    expect(addSite).not.toHaveAttribute("aria-current");
    expect(addSite.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Lamentis home" }).querySelector('img[alt=""]'),
    ).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent(assetPath("brandMark"))),
    );
    for (const todayLink of screen.getAllByRole("link", { name: "Today" })) {
      expect(todayLink).toHaveAttribute("aria-current", "page");
    }
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
    expect(dialog).toHaveTextContent("Today");
    expect(dialog).toHaveTextContent("Trending");
    expect(dialog).toHaveTextContent("Search");
    expect(dialog).toHaveTextContent("Home");
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
    const germanLink = screen.getByRole("link", { name: "Deutsch" });
    expect(trigger.getAttribute("aria-controls")).toBe(germanLink.closest("ul")?.id);
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
