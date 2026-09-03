"use client";

import { useRef } from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import type { CompanyMember } from "@/lib/types";
import { addCompanyPerson, setProjectStaffing } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/form";
import PeoplePicker from "@/components/PeoplePicker";

type Teammate = { email: string; name: string | null; invitePending: boolean };

const MAX_AVATARS = 4;

function initials(name: string | null, email: string): string {
  const base = (name || email.split("@")[0] || "").trim();
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (base.slice(0, 2) || "?").toUpperCase();
}

function hueFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
}

function Avatar({ person, className = "" }: { person: Teammate; className?: string }) {
  const label = person.name ?? person.email;
  return (
    <span
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-panel ${className}`}
      style={{ backgroundColor: `hsl(${hueFor(person.email)} 42% 46%)` }}
    >
      {initials(person.name, person.email)}
    </span>
  );
}

/**
 * The project header's "People" cell: a Jira-style stack of teammate avatars
 * with a "+" that opens a popover for adding / removing delivery people. There
 * is no separate People page.
 */
export function ProjectPeopleField({
  projectId,
  team,
  canManage,
  directory,
  selectedMemberIds,
  companyId,
}: {
  projectId: string;
  team: Teammate[];
  canManage: boolean;
  directory: CompanyMember[];
  selectedMemberIds: string[];
  companyId: string;
}) {
  const op = useRef<OverlayPanel>(null);
  const shown = team.slice(0, MAX_AVATARS);
  const rest = team.slice(MAX_AVATARS);

  return (
    <div>
      <dt className="mb-1 text-xs font-medium text-ink-muted">People</dt>
      <dd className="flex items-center pl-1.5">
        {team.length === 0 && !canManage ? (
          <span className="text-ink">—</span>
        ) : (
          shown.map((p) => <Avatar key={p.email} person={p} className="-ml-1.5" />)
        )}

        {rest.length > 0 ? (
          <span
            title={rest.map((p) => p.name ?? p.email).join(", ")}
            className="-ml-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-band text-[11px] font-semibold text-ink-muted ring-2 ring-panel"
          >
            +{rest.length}
          </span>
        ) : null}

        {canManage ? (
          <>
            <button
              type="button"
              aria-label="Add or remove people"
              onClick={(e) => op.current?.toggle(e)}
              className="-ml-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--input-border)] bg-panel text-ink-muted ring-2 ring-panel transition-colors hover:border-link hover:text-link"
            >
              <i className="pi pi-plus text-[11px]" />
            </button>
            <OverlayPanel ref={op} className="eos-overlay eos-people-op">
              <div className="mb-2 text-xs font-semibold text-ink">Project people</div>
              <ActionForm
                action={setProjectStaffing.bind(null, projectId)}
                success="People updated."
                className="space-y-3"
              >
                <PeoplePicker
                  directory={directory}
                  name="memberIds"
                  emit="id"
                  selectedLayout="rows"
                  defaultSelected={selectedMemberIds}
                  placeholder="Search your company by name or email…"
                  addPerson={addCompanyPerson.bind(null, companyId)}
                  addContextLabel="your company"
                  emptyHint="No one on this project yet — search above to add people from your company."
                />
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </OverlayPanel>
          </>
        ) : null}
      </dd>
    </div>
  );
}
