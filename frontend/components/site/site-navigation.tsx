"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  contentByLocale,
  type FooterSectionLink,
  type Locale,
} from "../../domain/site/content";

type SiteNavigationProps = {
  locale: Locale;
};

type ProductLink = FooterSectionLink & { href: string };
type ProductSlug = NonNullable<FooterSectionLink["product"]>;
type SetMobileMenuOpen = Dispatch<SetStateAction<boolean>>;

const desktopNavigationQuery = "(min-width: 641px)";
const productGithubHrefs = {
  nox: "https://github.com/Lamentis-O/nox",
  noma: "https://github.com/Lamentis-O/noma",
} satisfies Record<ProductSlug, string>;

function useMeasuredNavigationHeight(navigationInnerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const navigationInner = navigationInnerRef.current;

    if (!navigationInner) {
      return undefined;
    }

    const updateNavigationHeight = () => {
      document.documentElement.style.setProperty(
        "--ds-site-navigation-height",
        `${navigationInner.offsetHeight}px`,
      );
    };

    updateNavigationHeight();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        document.documentElement.style.removeProperty("--ds-site-navigation-height");
      };
    }

    const observer = new ResizeObserver(updateNavigationHeight);
    observer.observe(navigationInner);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--ds-site-navigation-height");
    };
  }, [navigationInnerRef]);
}

function useBodyScrollLock(isMobileMenuOpen: boolean) {
  useEffect(() => {
    document.body.classList.toggle("has-open-site-navigation", isMobileMenuOpen);

    return () => {
      document.body.classList.remove("has-open-site-navigation");
    };
  }, [isMobileMenuOpen]);
}

function useCloseMobileMenuOnRouteChange(
  isMobileMenuOpen: boolean,
  pathname: string,
  setIsMobileMenuOpen: SetMobileMenuOpen,
) {
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return undefined;
    }

    previousPathnameRef.current = pathname;

    if (!isMobileMenuOpen) {
      return undefined;
    }

    const closeMenu = window.setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(closeMenu);
    };
  }, [isMobileMenuOpen, pathname, setIsMobileMenuOpen]);
}

function useCloseMobileMenuOnDesktop(
  isMobileMenuOpen: boolean,
  setIsMobileMenuOpen: SetMobileMenuOpen,
) {
  useEffect(() => {
    if (!isMobileMenuOpen || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const desktopQuery = window.matchMedia(desktopNavigationQuery);
    const closeMenuOnDesktop = () => {
      if (desktopQuery.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    closeMenuOnDesktop();
    desktopQuery.addEventListener("change", closeMenuOnDesktop);

    return () => {
      desktopQuery.removeEventListener("change", closeMenuOnDesktop);
    };
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);
}

function ProductLinks({
  links,
  pathname,
}: {
  links: ProductLink[];
  pathname: string;
}) {
  return (
    <div className="ds-site-navigation__links">
      {links.map((link) => {
        const isActive = pathname === link.href;
        const className = isActive
          ? "ds-site-navigation__link ds-site-navigation__link--active"
          : "ds-site-navigation__link";

        return (
          <Link
            key={link.href}
            href={link.href}
            className={className}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="ds-site-navigation__link-label-full">
              {link.label}
            </span>
            <span className="ds-site-navigation__link-label-short" aria-hidden="true">
              {link.productName ?? link.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function getActiveProductGithubHref(pathname: string, locale: Locale) {
  const activeProduct = Object.keys(productGithubHrefs).find(
    (product) => pathname === `/${locale}/${product}`,
  ) as ProductSlug | undefined;

  return activeProduct ? productGithubHrefs[activeProduct] : null;
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.372 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.011-1.04-.016-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.335-1.756-1.335-1.756-1.091-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.81 1.305 3.495.998.108-.774.418-1.306.76-1.605-2.665-.304-5.467-1.332-5.467-5.931 0-1.31.467-2.381 1.236-3.22-.125-.304-.535-1.527.117-3.184 0 0 1.008-.322 3.3 1.23a11.37 11.37 0 0 1 3.003-.404c1.02.005 2.046.137 3.003.404 2.29-1.552 3.296-1.23 3.296-1.23.654 1.657.244 2.88.12 3.184.77.839 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.922.43.372.823 1.103.823 2.222 0 1.605-.014 2.898-.014 3.293 0 .319.216.694.825.576C20.565 21.796 24 17.3 24 12 24 5.373 18.627 0 12 0z"
      />
    </svg>
  );
}

function ProductGithubLink({ href }: { href: string }) {
  return (
    <a
      className="ds-site-navigation__github-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <GitHubIcon />
      <span>GitHub</span>
    </a>
  );
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  const paths = isOpen
    ? ["M5.5 5.5L16.5 16.5", "M16.5 5.5L5.5 16.5"]
    : ["M4.5 7H17.5", "M4.5 15H17.5"];

  return (
    <svg
      className="ds-site-navigation__menu-icon"
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
    >
      {paths.map((path) => (
        <path
          key={path}
          d={path}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function MobileMenu({
  links,
  onNavigate,
}: {
  links: ProductLink[];
  onNavigate: () => void;
}) {
  return (
    <div id="site-navigation-mobile-menu" className="ds-site-navigation__mobile-menu">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="ds-site-navigation__mobile-link"
          onClick={onNavigate}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function SiteNavigation({ locale }: SiteNavigationProps) {
  const links = contentByLocale[locale].footer.platform.links;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const navigationInnerRef = useRef<HTMLDivElement>(null);

  const productLinks = links.filter((link): link is ProductLink => Boolean(link.href));
  const activeProductGithubHref = getActiveProductGithubHref(pathname, locale);

  useMeasuredNavigationHeight(navigationInnerRef);
  useBodyScrollLock(isMobileMenuOpen);
  useCloseMobileMenuOnRouteChange(isMobileMenuOpen, pathname, setIsMobileMenuOpen);
  useCloseMobileMenuOnDesktop(isMobileMenuOpen, setIsMobileMenuOpen);

  return (
    <nav className="ds-site-navigation" aria-label="Product navigation">
      <div
        ref={navigationInnerRef}
        className="ds-page-boundary ds-site-navigation__inner"
      >
        <Link href={`/${locale}`} className="ds-site-navigation__brand" aria-label="Lamentis">
          <Image
            src="/assets/images/app-logo-20260424.png"
            alt=""
            width={44}
            height={44}
            className="ds-site-navigation__brand-logo"
          />
          <span>Lamentis</span>
        </Link>

        <ProductLinks links={productLinks} pathname={pathname} />

        {activeProductGithubHref ? (
          <ProductGithubLink href={activeProductGithubHref} />
        ) : null}

        <button
          type="button"
          className="ds-site-navigation__menu-button"
          aria-label={
            isMobileMenuOpen ? "Close product navigation" : "Open product navigation"
          }
          aria-controls="site-navigation-mobile-menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          <MenuIcon isOpen={isMobileMenuOpen} />
        </button>

        {isMobileMenuOpen ? (
          <MobileMenu
            links={productLinks}
            onNavigate={() => setIsMobileMenuOpen(false)}
          />
        ) : null}
      </div>
    </nav>
  );
}
