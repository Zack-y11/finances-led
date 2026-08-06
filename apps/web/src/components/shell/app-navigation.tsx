"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overview", icon: "chart" },
  { href: "/ledger", label: "Transactions", icon: "ledger" },
  { href: "/capture", label: "Quick Capture", icon: "sparkles" },
  { href: "/groups", label: "Groups", icon: "groups" },
  { href: "/review", label: "Review Inbox", icon: "inbox" },
  { href: "/rules", label: "Rules", icon: "rule" },
  {
    href: "/settings/accounts",
    label: "Accounts",
    icon: "wallet",
  },
  {
    href: "/settings/categories",
    label: "Categories",
    icon: "tag",
  },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/groups")
      return pathname === "/groups" || pathname.startsWith("/groups/");
    return pathname === href;
  }

  function navigationLink(
    item: (typeof items)[number],
    compact: boolean,
    onNavigate?: () => void,
  ) {
    const active = isActive(item.href);
    const className = compact
      ? `flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-colors ${active ? "bg-action-soft text-action" : "text-muted hover:bg-surface-muted hover:text-ink"}`
      : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-action-soft text-action" : "text-muted hover:bg-surface-muted hover:text-ink"}`;

    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={className}
        href={item.href}
        key={item.href}
        onClick={onNavigate}
      >
        <Icon className="size-5" name={item.icon} />
        <span>{item.label}</span>
      </Link>
    );
  }

  if (!mobile) {
    return (
      <nav aria-label="Primary navigation" className="grid gap-1">
        {items.map((item) => navigationLink(item, false))}
      </nav>
    );
  }

  const mobileItems = [
    { ...items[0], label: "Home" },
    items[1],
    { ...items[2], label: "Capture" },
    items[3],
    items[8],
  ];

  return (
    <nav aria-label="Primary navigation" className="grid grid-cols-5 gap-1">
      {mobileItems.map((item) => navigationLink(item, true))}
    </nav>
  );
}
