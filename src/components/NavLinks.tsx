"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import type { ViewMode } from "@/lib/view-mode";

type NavItem = { href: string; label: string; icon: string };

const DELIVERY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "pi-th-large" },
  { href: "/projects", label: "Projects", icon: "pi-folder-open" },
  { href: "/milestones", label: "Milestones", icon: "pi-flag" },
  { href: "/team", label: "My Company", icon: "pi-users" },
  { href: "/companies", label: "Clients", icon: "pi-building" },
];

// Client (review) lens: no project creation, no company administration.
const CLIENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "pi-th-large" },
  { href: "/projects", label: "Projects", icon: "pi-folder-open" },
  { href: "/milestones", label: "Milestones", icon: "pi-flag" },
];

export function NavLinks({
  mode = "delivery",
  onNavigate,
}: {
  mode?: ViewMode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = mode === "client" ? CLIENT_NAV : DELIVERY_NAV;

  const model: MenuItem[] = items.map((item) => {
    const active =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
    return {
      label: item.label,
      template: (_item, options) => (
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`${options.className} ${active ? "eos-nav-active" : ""}`}
        >
          <span className={`${options.iconClassName} pi ${item.icon}`} />
          <span className={options.labelClassName}>{item.label}</span>
        </Link>
      ),
    };
  });

  return <Menu model={model} className="eos-nav w-full border-none bg-transparent p-0" />;
}
