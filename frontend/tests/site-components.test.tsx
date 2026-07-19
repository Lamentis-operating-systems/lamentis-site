import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyPage } from "@/components/site/empty-page";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { SearchPage } from "@/components/site/search-page";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavigation } from "@/components/site/site-navigation";
import {
  getFooterContent,
  getNavigationContent,
} from "@/domain/site/content";

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
    expect(screen.queryByRole("link", { name: /GitHub/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Lamentis home" }).querySelector('img[alt=""]'),
    ).toHaveAttribute("src", expect.stringContaining("app-logo-20260424.png"));
  });

  it("opens an accessible mobile dialog with the same links", async () => {
    navigationState.pathname = "/en";
    render(<SiteNavigation content={getNavigationContent("en")} />);

    const trigger = screen.getByRole("button", { name: "Open primary navigation" });
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));

    const dialog = screen.getByRole("dialog", { name: "Primary navigation" });
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
    render(<SiteFooter locale="en" content={getFooterContent("en")} />);
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
      expect.stringContaining("about-favicon-elias-20260523-32.png"),
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("target", "_blank");
  });
});

describe("locale switcher", () => {
  it("preserves a localized semantic route and closes on Escape with focus return", async () => {
    navigationState.pathname = "/en/trending";
    render(
      <LocaleSwitcher
        locale="en"
        label="Language"
        options={getFooterContent("en").languageOptions}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Language" });
    fireEvent.click(trigger);
    expect(screen.getByRole("link", { name: "Deutsch" })).toHaveAttribute(
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
