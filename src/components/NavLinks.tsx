"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "pi-th-large" },
  { href: "/projects", label: "Projects", icon: "pi-folder-open" },
  { href: "/milestones", label: "Milestones", icon: "pi-flag" },
  { href: "/team", label: "My Company", icon: "pi-users" },
  { href: "/companies", label: "Companies", icon: "pi-building" },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const model: MenuItem[] = NAV_ITEMS.map((item) => {
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
