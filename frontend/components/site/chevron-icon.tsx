type ChevronIconProps = {
  open: boolean;
};

export function ChevronIcon({ open }: ChevronIconProps) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-open={open || undefined}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
