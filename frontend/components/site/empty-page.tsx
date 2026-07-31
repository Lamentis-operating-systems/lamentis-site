import layoutStyles from "./layout/site-layout.module.css";
import { PageMain } from "./page-main";
import { VisuallyHidden } from "./visually-hidden";

type EmptyPageProps = {
  label: string;
};

export function EmptyPage({ label }: EmptyPageProps) {
  return (
    <PageMain className={layoutStyles.main} aria-label={label}>
      <VisuallyHidden as="h1">{label}</VisuallyHidden>
    </PageMain>
  );
}
