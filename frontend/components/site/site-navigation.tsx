"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { NavigationContent } from "@/domain/site/content";
import { MenuIcon } from "./menu-icon";
import { PlusIcon } from "./plus-icon";
import styles from "./site-navigation.module.css";

type SiteNavigationProps = {
  content: NavigationContent;
};

type NavigationMenuProps = SiteNavigationProps & {
  pathname: string;
};

function NavigationMenu({ content, pathname }: NavigationMenuProps) {
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
          href={content.homeHref}
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

        <Link
          className={styles.addSiteLink}
          href={content.addSiteAction.href}
          aria-label={content.addSiteAction.label}
          aria-current={pathname === content.addSiteAction.href ? "page" : undefined}
        >
          <PlusIcon />
          <span>{content.addSiteAction.label}</span>
        </Link>

        <button
          type="button"
          className={styles.menuButton}
          aria-label={mobileMenuOpen ? content.closeMenuLabel : content.openMenuLabel}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-primary-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <MenuIcon open={mobileMenuOpen} />
        </button>

        <dialog
          ref={dialogRef}
          id="mobile-primary-navigation"
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
            <Link
              href={content.addSiteAction.href}
              className={`${styles.mobileLink} ${styles.mobileAddSiteLink}`}
              aria-current={pathname === content.addSiteAction.href ? "page" : undefined}
              onClick={closeMobileMenu}
            >
              <PlusIcon />
              <span>{content.addSiteAction.label}</span>
            </Link>
          </div>
        </dialog>
      </div>
    </nav>
  );
}

export function SiteNavigation({ content }: SiteNavigationProps) {
  const pathname = usePathname();
  return <NavigationMenu key={pathname} content={content} pathname={pathname} />;
}
