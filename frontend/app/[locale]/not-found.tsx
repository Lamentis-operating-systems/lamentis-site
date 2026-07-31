"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import layoutStyles from "@/components/site/layout/site-layout.module.css";
import { PageMain } from "@/components/site/page-main";
import { getNotFoundContent } from "@/domain/site/not-found-content";
import { defaultLocale, isSupportedLocale, routePath } from "@/domain/site/routes";
import styles from "./not-found.module.css";

export default function NotFoundPage() {
  const params = useParams<{ locale?: string }>();
  const locale = isSupportedLocale(params.locale) ? params.locale : defaultLocale;
  const copy = getNotFoundContent(locale);

  return (
    <PageMain className={`${layoutStyles.main} ${styles.page}`}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.description}>{copy.description}</p>
      <Link
        className={styles.link}
        href={routePath({ scope: "localized", locale, routeId: "home" })}
      >
        {copy.homeLabel}
      </Link>
    </PageMain>
  );
}
