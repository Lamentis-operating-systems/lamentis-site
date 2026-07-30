"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import type {
  NavigationAction,
  NavigationContent,
} from "@/domain/site/content";
import { assetManifest } from "@/domain/site/assets";
import { serializeLocalePreference } from "@/domain/site/locale-preference";
import { siteConfig, type SiteRouteId } from "@/domain/site/routes";
import { IconButton } from "../icon-button";
import layoutStyles from "../layout/site-layout.module.css";
import primaryActionStyles from "../primary-action.module.css";
import { PlusIcon } from "../icons/plus-icon";
import { useModalDialog } from "../use-modal-dialog";
import { MenuIcon } from "./menu-icon";
import styles from "./site-navigation.module.css";

const ApiContractsDownloadButton = dynamic(() => (
  import("./api-contracts-download-button").then(
    (module) => module.ApiContractsDownloadButton,
  )
));

type NavigationMenuProps = {
  activeRouteId: SiteRouteId | null;
  content: NavigationContent;
};

type NavigationActionItemProps = {
  action: NavigationAction;
  activeRouteId: SiteRouteId | null;
  className: string;
  onDownload?: () => void;
  onNavigate: () => void;
};

function NavigationActionItem({
  action,
  activeRouteId,
  className,
  onDownload,
  onNavigate,
}: NavigationActionItemProps) {
  if (action.kind === "api-contract-download") {
    return (
      <ApiContractsDownloadButton
        className={className}
        errorLabel={action.errorLabel}
        label={action.label}
        onDownload={onDownload}
      />
    );
  }

  return (
    <Link
      className={className}
      href={action.href}
      aria-label={action.label}
      aria-current={
        activeRouteId === action.routeId ? "page" : undefined
      }
      onClick={onNavigate}
    >
      <PlusIcon />
      <span>{action.label}</span>
    </Link>
  );
}

export function NavigationMenu({ activeRouteId, content }: NavigationMenuProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dialogId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog(mobileMenuOpen, {
    returnFocusRef: menuButtonRef,
  });
  const brandMark = assetManifest.files.brandMark;
  const action = (
    activeRouteId
      ? content.actionOverrides[activeRouteId]
      : undefined
  ) ?? content.action;

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function rememberContentLocale() {
    document.cookie = serializeLocalePreference(content.locale);
  }

  function handleMobileNavigation() {
    rememberContentLocale();
    closeMobileMenu();
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

        <NavigationActionItem
          action={action}
          activeRouteId={activeRouteId}
          className={
            `${styles.navigationAction} ${primaryActionStyles.action}`
          }
          onNavigate={rememberContentLocale}
        />

        <IconButton
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-label={mobileMenuOpen ? content.closeMenuLabel : content.openMenuLabel}
          aria-expanded={mobileMenuOpen}
          aria-controls={dialogId}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <MenuIcon open={mobileMenuOpen} />
        </IconButton>

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
            <IconButton
              type="button"
              className={styles.dialogCloseButton}
              aria-label={content.closeMenuLabel}
              onClick={closeMobileMenu}
            >
              <MenuIcon open />
            </IconButton>
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
            {action.kind !== "api-contract-download" ? (
              <NavigationActionItem
                action={action}
                activeRouteId={activeRouteId}
                className={`${styles.mobileLink} ${styles.mobileAction}`}
                onNavigate={handleMobileNavigation}
              />
            ) : null}
          </div>
        </dialog>
      </div>
    </nav>
  );
}
