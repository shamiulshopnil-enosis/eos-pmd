"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS: { match: RegExp; label: string; href: string }[] = [
  { match: /^\/dashboard/, label: "Dashboard", href: "/dashboard" },
  { match: /^\/projects/, label: "Projects", href: "/projects" },
  { match: /^\/milestones/, label: "Milestones", href: "/milestones" },
  { match: /^\/team/, label: "My Company", href: "/team" },
  { match: /^\/companies/, label: "Clients", href: "/companies" },
];

/** Company / Section breadcrumb in the app header. Section links back to its
 *  list; the specific record name lives in the page's own <PageHeader>. */
export function Breadcrumbs({ company }: { company: string }) {
  const pathname = usePathname();
  const section = SECTIONS.find((s) => s.match.test(pathname));
  const onList = section && (pathname === section.href || pathname === "/dashboard");

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-ink-muted">
      <span className="truncate text-ink">{company}</span>
      {section ? (
        <>
          <span className="text-ink-subtle" aria-hidden="true">
            /
          </span>
          {onList ? (
            <span className="truncate text-ink-muted">{section.label}</span>
          ) : (
            <Link href={section.href} className="truncate text-ink-muted hover:text-link hover:underline">
              {section.label}
            </Link>
          )}
        </>
      ) : null}
    </nav>
  );
}
