import styles from "./placeholder-page.module.css";

type PlaceholderPageProps = {
  title: string;
  status: string;
};

export function PlaceholderPage({ title, status }: PlaceholderPageProps) {
  return (
    <main className={styles.page}>
      <div className={`siteContainer ${styles.content}`}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.status}>{status}</p>
      </div>
    </main>
  );
}
