type MenuIconProps = {
  open: boolean;
};

export function MenuIcon({ open }: MenuIconProps) {
  const paths = open
    ? ["M5.5 5.5L16.5 16.5", "M16.5 5.5L5.5 16.5"]
    : ["M4.5 7H17.5", "M4.5 15H17.5"];

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 22 22"
      fill="none"
    >
      {paths.map((path) => (
        <path
          key={path}
          d={path}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
