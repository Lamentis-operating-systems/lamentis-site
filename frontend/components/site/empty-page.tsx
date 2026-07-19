import styles from "./empty-page.module.css";

type EmptyPageProps = {
  label: string;
};

export function EmptyPage({ label }: EmptyPageProps) {
  return <main className={styles.page} aria-label={label} />;
}
