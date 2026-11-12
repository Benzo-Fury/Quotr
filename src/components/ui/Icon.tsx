import type { ReactElement } from "react";

/* Line icons: 24px grid, 1.5px stroke, round caps and joins, currentColor. */
const ICONS = {
  plus: <path d="M12 5v14M5 12h14" />,
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  calendar: (
    <>
      <rect x={4} y={5.5} width={16} height={14.5} rx={2} />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  users: (
    <>
      <circle cx={9} cy={8} r={3.25} />
      <path d="M3 20a6 6 0 0 1 12 0M16 4.8a3.25 3.25 0 0 1 0 6.4M21 20a6 6 0 0 0-3.5-5.4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx={15} cy={7} r={2} />
      <circle cx={9} cy={17} r={2} />
    </>
  ),
  search: (
    <>
      <circle cx={11} cy={11} r={6.5} />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  send: (
    <>
      <path d="M4.5 11.5 20 4l-7.5 15.5-2-6z" />
      <path d="M10.5 13.5 20 4" />
    </>
  ),
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />,
  "arrow-up": <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />,
  "arrow-down": <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />,
  more: (
    <>
      <circle cx={5.5} cy={12} r={1.1} fill="currentColor" />
      <circle cx={12} cy={12} r={1.1} fill="currentColor" />
      <circle cx={18.5} cy={12} r={1.1} fill="currentColor" />
    </>
  ),
  check: <path d="M5 12.5 9.5 17 19 7" />,
  grip: (
    <>
      {[6, 12, 18].map((y) => (
        <g key={y}>
          <circle cx={9} cy={y} r={1} fill="currentColor" />
          <circle cx={15} cy={y} r={1} fill="currentColor" />
        </g>
      ))}
    </>
  ),
  "chevron-down": <path d="M6.5 9.5 12 15l5.5-5.5" />,
  "chevron-left": <path d="M14.5 6.5 9 12l5.5 5.5" />,
  /* Added in the same style for this app. */
  save: (
    <>
      <path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
      <path d="M8 4v4h7V4M8 20v-6h8v6" />
    </>
  ),
  folder: <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  trash: (
    <>
      <path d="M4.5 7h15M10 4h4M6.5 7l1 12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  copy: (
    <>
      <rect x={8.5} y={8.5} width={11} height={11} rx={2} />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  menu: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx={12} cy={12} r={2.75} />
    </>
  ),
  pencil: <path d="M14.5 5.5l4 4M4.5 19.5l1-4.5L16 4.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5z" />,
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
  columns: (
    <>
      <rect x={3.5} y={4.5} width={17} height={15} rx={2} />
      <path d="M12 4.5v15" />
    </>
  ),
  mail: (
    <>
      <rect x={3.5} y={5.5} width={17} height={13} rx={2} />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  phone: <path d="M6.5 4h3l1.5 4-2 1.25a9 9 0 0 0 5.75 5.75L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx={12} cy={10} r={2.25} />
    </>
  ),
  building: (
    <>
      <path d="M5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 15 5v15.5M15 9.5h3.5A1.5 1.5 0 0 1 20 11v9.5M3.5 20.5h17" />
      <path d="M8.5 7.5h3M8.5 11h3M8.5 14.5h3" />
    </>
  ),
  upload: <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14" />,
  user: (
    <>
      <circle cx={12} cy={8} r={3.5} />
      <path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5" />
    </>
  ),
  hash: <path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h15M4 15h15" />,
  globe: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5z" />
    </>
  ),
  bank: <path d="M3.5 9.5 12 4.5l8.5 5M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 19.5h17" />,
} satisfies Record<string, ReactElement>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      className={"block flex-none " + (className ?? "")}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {ICONS[name]}
    </svg>
  );
}
