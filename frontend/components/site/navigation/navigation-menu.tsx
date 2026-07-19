"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import type { NavigationContent } from "@/domain/site/content";
import { assetManifest } from "@/domain/site/assets";
import { siteConfig, type SiteRouteId } from "@/domain/site/routes";
import layoutStyles from "../layout/site-layout.module.css";
import { MenuIcon } from "./menu-icon";
import { PlusIcon } from "./plus-icon";
import styles from "./site-navigation.module.css";

type NavigationMenuProps = {
  activeRouteId: SiteRouteId | null;
  content: NavigationContent;
};

export function NavigationMenu({ activeRouteId, content }: NavigationMenuProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const brandMark = assetManifest.files.brandMark;

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
      <div className={`${layoutStyles.container} ${styles.inner}`}>
        <Link
          href={content.homeHref}
          className={styles.brand}
          aria-label={content.homeLabel}
        >
          <Image
            src={brandMark.path}
            alt=""
            width={brandMark.width}
            height={brandMark.height}
            className={styles.brandLogo}
            priority
          />
          <span>{siteConfig.brandName}</span>
        </Link>

        <div className={styles.desktopLinks}>
          {content.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={styles.navigationLink}
              aria-current={activeRouteId === item.routeId ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <Link
          className={styles.addSiteLink}
          href={content.addSiteAction.href}
          aria-label={content.addSiteAction.label}
          aria-current={activeRouteId === content.addSiteAction.routeId ? "page" : undefined}
        >
          <PlusIcon />
          <span>{content.addSiteAction.label}</span>
        </Link>

        <button
          type="button"
          className={styles.menuButton}
          aria-label={mobileMenuOpen ? content.closeMenuLabel : content.openMenuLabel}
          aria-expanded={mobileMenuOpen}
          aria-controls={dialogId}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <MenuIcon open={mobileMenuOpen} />
        </button>

        <dialog
          ref={dialogRef}
          id={dialogId}
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
            <span>{siteConfig.brandName}</span>
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
                aria-current={activeRouteId === item.routeId ? "page" : undefined}
                onClick={closeMobileMenu}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={content.addSiteAction.href}
              className={`${styles.mobileLink} ${styles.mobileAddSiteLink}`}
              aria-current={activeRouteId === content.addSiteAction.routeId ? "page" : undefined}
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
