"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { NavigationContent } from "@/domain/site/content";
import { routePath, type Locale } from "@/domain/site/routes";
import { GitHubIcon } from "./github-icon";
import { MenuIcon } from "./menu-icon";
import styles from "./site-navigation.module.css";

type SiteNavigationProps = {
  locale: Locale;
  content: NavigationContent;
};

type NavigationMenuProps = SiteNavigationProps & {
  pathname: string;
};

function NavigationMenu({ locale, content, pathname }: NavigationMenuProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (mobileMenuOpen && !dialog.open) dialog.showModal();
    if (!mobileMenuOpen && dialog.open) dialog.close();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [mobileMenuOpen]);

  const activeItem = content.items.find((item) => item.href === pathname);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeMobileMenu();
  }

  return (
    <nav className={styles.navigation} aria-label={content.ariaLabel}>
      <div className={`siteContainer ${styles.inner}`}>
        <Link
          href={routePath(locale, "home")}
          className={styles.brand}
          aria-label={content.homeLabel}
        >
          <Image
            src="/assets/images/app-logo-20260424.png"
            alt=""
            width={44}
            height={44}
            className={styles.brandLogo}
            priority
          />
          <span>Lamentis</span>
        </Link>

        <div className={styles.desktopLinks}>
          {content.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={styles.navigationLink}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {activeItem ? (
          <a
            className={styles.githubLink}
            href={activeItem.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={content.githubLabel}
          >
            <GitHubIcon size="medium" />
            <span>GitHub</span>
          </a>
        ) : null}

        <button
          type="button"
          className={styles.menuButton}
          aria-label={mobileMenuOpen ? content.closeMenuLabel : content.openMenuLabel}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-product-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <MenuIcon open={mobileMenuOpen} />
        </button>

        <dialog
          ref={dialogRef}
          id="mobile-product-navigation"
          className={styles.mobileDialog}
          aria-label={content.ariaLabel}
          onCancel={(event) => {
            event.preventDefault();
            closeMobileMenu();
          }}
          onClose={closeMobileMenu}
          onClick={closeOnBackdrop}
        >
          <div className={styles.mobileDialogHeader}>
            <span>Lamentis</span>
            <button
              type="button"
              className={styles.dialogCloseButton}
              aria-label={content.closeMenuLabel}
              onClick={closeMobileMenu}
            >
              <MenuIcon open />
            </button>
          </div>
          <div className={styles.mobileDialogContent}>
            {content.items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={styles.mobileLink}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={closeMobileMenu}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </dialog>
      </div>
    </nav>
  );
}

export function SiteNavigation({ locale, content }: SiteNavigationProps) {
  const pathname = usePathname();
  return <NavigationMenu key={pathname} locale={locale} content={content} pathname={pathname} />;
}
