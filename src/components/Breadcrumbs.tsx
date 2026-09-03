"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ *
 * Breadcrumbs — a full, clickable trail in the app header.
 *
 * The trail is derived from the URL. Detail pages that know a record's
 * real name (a project, a milestone) feed it in with <SetBreadcrumb>,
 * keyed by that record's own path; until it arrives the crumb falls
 * back to a generic label ("Project", "Milestone").
 * ------------------------------------------------------------------ */

type Labels = Record<string, string>;
type Ctx = { labels: Labels; setLabels: (entries: Labels) => void };

const BreadcrumbContext = createContext<Ctx | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabelsState] = useState<Labels>({});

  // Merge in new record names; a no-op (returns the same state) when every
  // entry already matches, so it can never drive a render loop.
  const setLabels = useCallback((entries: Labels) => {
    setLabelsState((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [k, v] of Object.entries(entries)) {
        if (next[k] !== v) {
          next[k] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const value = useMemo(() => ({ labels, setLabels }), [labels, setLabels]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/**
 * Register real names for one or more record paths, e.g.
 * `{ ["/projects/" + id]: project.name }`. Rendered from a page (server
 * component included). Labels are only ever added — `buildTrail` reads only
 * the keys on the current path, so stale entries are harmless and there is
 * no unmount cleanup that could loop with the provider.
 */
export function SetBreadcrumb({ entries }: { entries: Labels }) {
  const ctx = useContext(BreadcrumbContext);
  const setLabels = ctx?.setLabels;
  const serialized = JSON.stringify(entries);
  useEffect(() => {
    if (!setLabels) return;
    setLabels(JSON.parse(serialized) as Labels);
  }, [setLabels, serialized]);
  return null;
}

// ------------------------------------------------------------------

type Crumb = { label: string; href?: string };

const STATIC_LABELS: Record<string, string> = {
  edit: "Edit",
  publish: "Publish",
  "public-preview": "Public preview",
  capstone: "Capstone",
};

/** Build the crumb trail (excluding the company root) from a pathname. */
function buildTrail(pathname: string, labels: Labels): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  const named = (path: string, fallback: string) => labels[path] ?? fallback;

  const [a, b, c, d, e] = parts;

  if (a === "dashboard") {
    crumbs.push({ label: "Dashboard", href: "/dashboard" });
  } else if (a === "projects") {
    crumbs.push({ label: "Projects", href: "/projects" });
    if (b === "new") {
      crumbs.push({ label: "New project" });
    } else if (b) {
      const projPath = `/projects/${b}`;
      crumbs.push({ label: named(projPath, "Project"), href: projPath });
      if (c === "milestones") {
        if (d === "new") {
          crumbs.push({ label: "New milestone" });
        } else if (d) {
          const msPath = `${projPath}/milestones/${d}`;
          crumbs.push({ label: named(msPath, "Milestone"), href: msPath });
          if (e === "edit") crumbs.push({ label: "Edit" });
        }
      } else if (c === "team") {
        crumbs.push({ label: "People" });
      } else if (c && STATIC_LABELS[c]) {
        crumbs.push({ label: STATIC_LABELS[c] });
      }
    }
  } else if (a === "milestones") {
    crumbs.push({ label: "Milestones", href: "/milestones" });
  } else if (a === "team") {
    crumbs.push({ label: "My Company", href: "/team" });
  } else if (a === "companies") {
    crumbs.push({ label: "Clients", href: "/companies" });
  } else if (a === "admin" && b === "projects") {
    // The admin area is just Approvals; the root crumb already stands for it.
    if (c) {
      const projPath = `/admin/projects/${c}`;
      crumbs.push({ label: named(projPath, "Project"), href: projPath });
    }
  }

  // The current page is never a link.
  if (crumbs.length > 0) delete crumbs[crumbs.length - 1].href;
  return crumbs;
}

function Sep() {
  return (
    <span className="shrink-0 text-ink-subtle" aria-hidden="true">
      /
    </span>
  );
}

export function Breadcrumbs({ company, rootHref = "/dashboard" }: { company: string; rootHref?: string }) {
  const pathname = usePathname();
  const ctx = useContext(BreadcrumbContext);
  const trail = useMemo(() => buildTrail(pathname, ctx?.labels ?? {}), [pathname, ctx?.labels]);

  const root: Crumb = { label: company, href: trail.length > 0 ? rootHref : undefined };
  const full = [root, ...trail];
  // Mobile has little room and detail pages carry their own "← back" link, so
  // the compact bar shows just the current page, with a "‹" up-link only when
  // we're genuinely nested (past a section root).
  const current = full[full.length - 1];
  const parent = trail.length >= 2 ? full[full.length - 2] : null;

  const renderCrumb = (c: Crumb, i: number, arr: Crumb[]) => {
    const last = i === arr.length - 1;
    return (
      <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
        {i > 0 ? <Sep /> : null}
        {c.href && !last ? (
          <Link
            href={c.href}
            className="max-w-[9rem] truncate text-ink-muted hover:text-link hover:underline sm:max-w-[14rem]"
          >
            {c.label}
          </Link>
        ) : (
          <span
            className={`max-w-[11rem] truncate sm:max-w-[16rem] ${last ? "text-ink" : "text-ink-muted"}`}
            aria-current={last ? "page" : undefined}
          >
            {c.label}
          </span>
        )}
      </span>
    );
  };

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-sm">
      {/* Compact (mobile): a small "up" link + the current page */}
      <span className="flex min-w-0 items-center gap-1 sm:hidden">
        {parent?.href ? (
          <Link
            href={parent.href}
            aria-label={`Up to ${parent.label}`}
            className="shrink-0 text-ink-subtle hover:text-link"
          >
            ‹
          </Link>
        ) : null}
        <span className="truncate text-ink" aria-current="page">
          {current.label}
        </span>
      </span>
      {/* Full trail (sm and up), scrolls horizontally if long */}
      <span className="hidden min-w-0 items-center overflow-x-auto whitespace-nowrap sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {full.map((c, i, arr) => renderCrumb(c, i, arr))}
      </span>
    </nav>
  );
}
