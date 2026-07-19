"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { contentByLocale } from "@/domain/site/content";
import { defaultLocale, isSupportedLocale, routePath } from "@/domain/site/routes";
import styles from "./not-found.module.css";

export default function NotFoundPage() {
  const params = useParams<{ locale?: string }>();
  const locale = isSupportedLocale(params.locale) ? params.locale : defaultLocale;
  const copy = contentByLocale[locale].notFound;

  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.description}>{copy.description}</p>
      <Link className={styles.link} href={routePath(locale, "home")}>{copy.homeLabel}</Link>
    </main>
  );
}
