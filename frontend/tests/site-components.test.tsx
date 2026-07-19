import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHome } from "@/components/site/site-home";
import { SiteNavigation } from "@/components/site/site-navigation";
import {
  contentByLocale,
  getFooterContent,
  getNavigationContent,
} from "@/domain/site/content";

const navigationState = vi.hoisted(() => ({ pathname: "/en" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

describe("homepage", () => {
  it("renders the localized status without adding a marketing heading", () => {
    render(
      <SiteHome
        title={contentByLocale.de.home.title}
        statusLabel={contentByLocale.de.home.statusLabel}
      />,
    );
    expect(screen.getByText("Demnächst")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});

describe("site navigation", () => {
  it("renders canonical product links and opens an accessible mobile dialog", async () => {
    navigationState.pathname = "/en";
    render(<SiteNavigation locale="en" content={getNavigationContent("en")} />);

    expect(screen.getByRole("navigation", { name: "Product navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Noma Tasks" })).toHaveAttribute("href", "/en/noma");
    expect(screen.getByRole("link", { name: "Nox - Social Events" })).toHaveAttribute("href", "/en/nox");

    const trigger = screen.getByRole("button", { name: "Open product navigation" });
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByRole("dialog", { name: "Product navigation" })).toBeInTheDocument();
  });

  it("shows the repository action only on a product route", () => {
    navigationState.pathname = "/en/nox";
    render(<SiteNavigation locale="en" content={getNavigationContent("en")} />);
    expect(screen.getByRole("link", { name: "Open product repository on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/Lamentis-O/nox",
    );
  });
});

describe("site footer", () => {
  it("renders only active sections and safe external links", () => {
    navigationState.pathname = "/en";
    render(<SiteFooter locale="en" content={getFooterContent("en")} />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Legal Notice" })).toHaveAttribute(
      "href",
      "/en/legal-notice",
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("target", "_blank");
  });
});

describe("locale switcher", () => {
  it("preserves the semantic route and closes on Escape with focus return", async () => {
    navigationState.pathname = "/en/nox";
    render(
      <LocaleSwitcher
        locale="en"
        label="Language"
        options={getFooterContent("en").languageOptions}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Language" });
    fireEvent.click(trigger);
    expect(screen.getByRole("link", { name: "Deutsch" })).toHaveAttribute("href", "/de/nox");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("link", { name: "Deutsch" })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
