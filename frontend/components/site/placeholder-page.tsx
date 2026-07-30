import layoutStyles from "./layout/site-layout.module.css";
import styles from "./placeholder-page.module.css";

type PlaceholderPageProps = {
  title: string;
  status: string;
};

export function PlaceholderPage({ title, status }: PlaceholderPageProps) {
  return (
    <main className={`${layoutStyles.main} ${styles.page}`}>
      <div className={`${layoutStyles.container} ${styles.content}`}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.status}>{status}</p>
      </div>
    </main>
  );
}
