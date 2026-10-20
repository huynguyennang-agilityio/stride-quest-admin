export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#bef264" />
      <path
        d="M9 25c4-1 5-6 9-6s4 4 9-1"
        stroke="#151a12"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="27" cy="11" r="3.5" stroke="#151a12" strokeWidth="2.5" />
    </svg>
  );
}
