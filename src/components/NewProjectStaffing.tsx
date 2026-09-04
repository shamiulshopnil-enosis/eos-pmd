"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PeoplePicker, { type Person } from "@/components/PeoplePicker";
import ProjectMilestonesField, {
  type MilestonePerson,
} from "@/components/ProjectMilestonesField";

type NewPerson = { id: string; email: string; name: string | null };

/**
 * The "Assign people" + "Milestones" block on the new-project form, wired
 * together on the client so the milestone assignee picker only offers people
 * who are actually on the project: whoever is selected in "Assign people"
 * above, plus the creator (who becomes the project owner).
 */
export default function NewProjectStaffing({
  directory,
  addPerson,
  currentUser,
}: {
  directory: Person[];
  addPerson: (input: { name: string; email: string }) => Promise<NewPerson>;
  currentUser: { email: string; name: string | null };
}) {
  const [assigned, setAssigned] = useState<Person[]>([]);

  const milestonePeople = useMemo<MilestonePerson[]>(() => {
    const seen = new Set<string>();
    const out: MilestonePerson[] = [];
    for (const p of [
      { id: undefined, email: currentUser.email, name: currentUser.name },
      ...assigned,
    ]) {
      const key = p.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: p.id, email: p.email, name: p.name });
    }
    return out;
  }, [assigned, currentUser.email, currentUser.name]);

  return (
    <>
      <fieldset className="space-y-3 border-t border-rule pt-5">
        <legend className="text-xs font-semibold text-ink">Assign people</legend>
        <p className="text-xs text-ink-muted">
          You are added as the project owner automatically. Search your company&apos;s{" "}
          <Link href="/team" className="text-link hover:text-link-strong">
            people directory
          </Link>{" "}
          and add whoever works on this project. Only they (plus your company&apos;s owners and
          admins) will see it. You can change this later on the project&apos;s People page.
        </p>
        <PeoplePicker
          directory={directory}
          name="memberIds"
          emit="id"
          placeholder="Search your company by name or email…"
          addPerson={addPerson}
          addContextLabel="your company"
          emptyHint="No one added yet. You'll be the project owner regardless."
          onSelectionChange={setAssigned}
        />
      </fieldset>

      <ProjectMilestonesField people={milestonePeople} />
    </>
  );
}
