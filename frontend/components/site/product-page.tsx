import type { ProductId } from "@/domain/site/routes";
import styles from "./product-page.module.css";

type ProductPageProps = {
  productId: ProductId;
  title: string;
  tagline: string;
};

export function ProductPage({ productId, title, tagline }: ProductPageProps) {
  return (
    <main className={styles.page} data-product={productId}>
      <section className={`siteContainer ${styles.intro}`} aria-labelledby={`${productId}-title`}>
        <h1 id={`${productId}-title`} className={styles.title}>{title}</h1>
        <p className={styles.tagline}>{tagline}</p>
      </section>
    </main>
  );
}
