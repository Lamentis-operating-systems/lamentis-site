import layoutStyles from "./layout/site-layout.module.css";

type EmptyPageProps = {
  label: string;
};

export function EmptyPage({ label }: EmptyPageProps) {
  return <main className={layoutStyles.main} aria-label={label} />;
}
