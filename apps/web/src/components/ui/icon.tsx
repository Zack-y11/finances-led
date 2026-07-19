import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "chart"
  | "ledger"
  | "groups"
  | "plus"
  | "sparkles"
  | "settings"
  | "arrow-right"
  | "wallet"
  | "trend-up"
  | "trend-down"
  | "filter"
  | "search"
  | "shield"
  | "tag"
  | "inbox"
  | "rule";

const paths: Record<IconName, ReactNode> = {
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-7" />
    </>
  ),
  ledger: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h4" />
    </>
  ),
  groups: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3-1.8 5.2L5 10l5.2 1.8L12 17l1.8-5.2L19 10l-5.2-1.8L12 3Z" />
      <path d="m19 15-.8 2.2L16 18l2.2.8L19 21l.8-2.2L22 18l-2.2-.8L19 15Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.42 2.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56v.08h-3.4v-.08A1.7 1.7 0 0 0 9.96 19a1.7 1.7 0 0 0-1.88.34l-.06.06-2.42-2.42.06-.06A1.7 1.7 0 0 0 6 15.04a1.7 1.7 0 0 0-1.56-1.04h-.08v-3.4h.08A1.7 1.7 0 0 0 6 9.56 1.7 1.7 0 0 0 5.66 7.7l-.06-.06 2.42-2.42.06.06A1.7 1.7 0 0 0 9.96 5a1.7 1.7 0 0 0 1.04-1.56v-.08h3.4v.08A1.7 1.7 0 0 0 15.44 5a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.42 2.42-.06.06A1.7 1.7 0 0 0 19.4 9c.66.27 1.09.91 1.09 1.62v2.76c0 .71-.43 1.35-1.09 1.62Z" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
      <path d="M16 14h.01" />
    </>
  ),
  "trend-up": (
    <>
      <path d="m4 14 5-5 4 4 7-7" />
      <path d="M15 6h5v5" />
    </>
  ),
  "trend-down": (
    <>
      <path d="m4 10 5 5 4-4 7 7" />
      <path d="M15 18h5v-5" />
    </>
  ),
  filter: (
    <>
      <path d="M3 5h18M6 12h12M10 19h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.5 13.5 20.6a2 2 0 0 1-2.8 0l-7.3-7.3A2 2 0 0 1 3 11.9V5a2 2 0 0 1 2-2h6.9a2 2 0 0 1 1.4.6l7.3 7.3a2 2 0 0 1 0 2.6Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 4h16v12a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V4Z" />
      <path d="M4 14h5l2 3h2l2-3h5" />
    </>
  ),
  rule: (
    <>
      <path d="M4 6h16M4 18h16M8 6v6M16 12v6" />
      <circle cx="8" cy="13" r="2" />
      <circle cx="16" cy="11" r="2" />
    </>
  ),
};

export function Icon({
  name,
  className,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
