/** The Quotr mark, drawn to match the app icon: a quote sheet with a fern total on a fern squircle. */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="flex-none">
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <rect x="8.5" y="6.5" width="15" height="19.5" rx="1.6" fill="#fff" />
      <g stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="1" strokeLinecap="round">
        <line x1="11" y1="10.4" x2="19" y2="10.4" />
        <line x1="11" y1="12.7" x2="21" y2="12.7" />
        <line x1="11" y1="15" x2="19.8" y2="15" />
      </g>
      <line x1="11" y1="19.9" x2="21" y2="19.9" stroke="var(--color-ink)" strokeWidth="0.5" />
      <rect x="17" y="21.4" width="4" height="1.8" rx="0.6" fill="var(--color-accent)" />
    </svg>
  );
}
