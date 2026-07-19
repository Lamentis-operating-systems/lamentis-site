import Link from "next/link";
import type { FooterLink as FooterLinkModel } from "@/domain/site/content";
import { GitHubIcon } from "./github-icon";
import { ProfileIcon } from "./profile-icon";
import styles from "./site-footer.module.css";

type FooterLinkProps = {
  link: FooterLinkModel;
  reserveIconSlot: boolean;
};

export function FooterLink({ link, reserveIconSlot }: FooterLinkProps) {
  const icon = link.icon === "profile"
    ? <ProfileIcon />
    : link.icon === "github"
      ? <GitHubIcon />
      : null;
  const content = (
    <span
      className={`${styles.linkContent} ${
        reserveIconSlot ? styles.linkContentWithIcon : ""
      }`}
    >
      {reserveIconSlot ? (
        <span className={styles.linkIcon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.linkLabel}>{link.label}</span>
    </span>
  );

  if (link.kind === "internal") {
    return <Link className={styles.link} href={link.href}>{content}</Link>;
  }

  return (
    <a
      className={styles.link}
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  );
}
