import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyCompany, getProject, listCompanyMembers, listTeams } from "@/lib/data";
import { canManageDeliveryStaffing, canManageReview } from "@/lib/permissions";
import { setProjectStaffing, setReviewStaffing } from "@/lib/actions";
import type { CompanyMember, Team } from "@/lib/types";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";

export default async function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await getProject(id);
  if (!project) notFound();

  const canDelivery = canManageDeliveryStaffing(project);
  const canReview = canManageReview(project);
  if (!canDelivery && !canReview && user.role !== "admin") notFound();

  const myCompany = await getMyCompany().catch(() => null);
  const [teams, members] = myCompany
    ? await Promise.all([listTeams(), listCompanyMembers(myCompany.id)])
    : [[], []];

  const showDeliveryForm = canDelivery && myCompany?.id === project.deliveringCompanyId;
  const showReviewForm = canReview && myCompany?.id === project.receivingCompanyId;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Team — ${project.name}`}
        description="Assign your company's teams and people to this project. People are managed in your Company; assignment is a live reference."
        back={{ href: `/projects/${id}`, label: "Back to Project" }}
      />

      {showDeliveryForm ? (
        <StaffingCard
          title="Delivery Staffing"
          teams={teams}
          members={members}
          selectedTeamIds={project.assignedTeamIds}
          selectedMemberIds={project.assignedMemberIds}
          action={setProjectStaffing.bind(null, id)}
        />
      ) : null}

      {showReviewForm ? (
        <StaffingCard
          title="Review Staffing"
          teams={teams}
          members={members}
          selectedTeamIds={project.receivingTeamIds}
          selectedMemberIds={project.receivingMemberIds}
          action={setReviewStaffing.bind(null, id)}
        />
      ) : null}

      <Card className="mb-6 p-5">
        <SectionHeading>Delivery Team (effective)</SectionHeading>
        <PeopleList people={project.vendorTeam} leadTone="owner" />
      </Card>

      <Card className="p-5">
        <SectionHeading>Client Contacts (effective)</SectionHeading>
        {project.clientContacts.length === 0 ? (
          <p className="text-sm text-slate-400">The client company has not staffed this project yet.</p>
        ) : (
          <PeopleList people={project.clientContacts} leadTone="primary" />
        )}
      </Card>
    </div>
  );
}

function StaffingCard({
  title,
  teams,
  members,
  selectedTeamIds,
  selectedMemberIds,
  action,
}: {
  title: string;
  teams: Team[];
  members: CompanyMember[];
  selectedTeamIds: string[];
  selectedMemberIds: string[];
  action: (formData: FormData) => void;
}) {
  return (
    <Card className="mb-6 p-5">
      <SectionHeading>{title}</SectionHeading>
      {teams.length === 0 && members.length === 0 ? (
        <p className="text-sm text-slate-400">
          Your company has no people yet.{" "}
          <Link href="/team" className="text-blue-600 hover:underline">
            Set up teams and people
          </Link>
          .
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="teamIds" value="" />
          <input type="hidden" name="memberIds" value="" />
          {teams.length > 0 ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Teams</div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {teams.map((t) => (
                  <label key={t.id} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      name="teamIds"
                      value={t.id}
                      defaultChecked={selectedTeamIds.includes(t.id)}
                      className="mt-0.5"
                    />
                    <span>
                      {t.name}
                      <span className="block text-xs text-slate-400">
                        {t.members.length} member{t.members.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {members.length > 0 ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Individuals</div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      name="memberIds"
                      value={m.id}
                      defaultChecked={selectedMemberIds.includes(m.id)}
                    />
                    {m.name ? `${m.name} · ` : ""}
                    {m.email}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
        </form>
      )}
    </Card>
  );
}

function PeopleList({
  people,
  leadTone,
}: {
  people: { email: string; name: string | null; role: string; invitePending: boolean }[];
  leadTone: string;
}) {
  return (
    <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
      {people.map((p) => (
        <li key={p.email} className="flex items-center justify-between py-2">
          <span className="text-slate-700 dark:text-slate-200">
            {p.name ? `${p.name} · ` : ""}
            {p.email}
          </span>
          <span className="inline-flex gap-1">
            <Badge tone={p.role === leadTone ? "blue" : "slate"}>{p.role}</Badge>
            {p.invitePending ? <Badge tone="amber">Not signed in</Badge> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
