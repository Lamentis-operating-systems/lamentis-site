import Image from "next/image";
import styles from "./site-home.module.css";

type SiteHomeProps = {
  title: string;
  statusLabel: string;
};

export function SiteHome({ title, statusLabel }: SiteHomeProps) {
  return (
    <main className={styles.page} aria-label={title}>
      <div className={styles.content}>
        <Image
          src="/assets/images/lamentis-loader-logo-static.png"
          alt=""
          className={styles.image}
          width={256}
          height={256}
          priority
        />
        <p className={styles.label}>{statusLabel}</p>
      </div>
    </main>
  );
}
