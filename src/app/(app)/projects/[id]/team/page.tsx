import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyCompany, getProject, listCompanyMembers } from "@/lib/data";
import { canManageDeliveryStaffing, canManageReview } from "@/lib/permissions";
import { setProjectStaffing, setReviewStaffing } from "@/lib/actions";
import type { CompanyMember } from "@/lib/types";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import PeoplePicker from "@/components/PeoplePicker";

export default async function ProjectPeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await getProject(id);
  if (!project) notFound();

  const canDelivery = canManageDeliveryStaffing(project);
  const canReview = canManageReview(project);
  if (!canDelivery && !canReview && user.role !== "admin") notFound();

  const myCompany = await getMyCompany().catch(() => null);
  const members = myCompany ? await listCompanyMembers(myCompany.id) : [];

  const showDeliveryForm = canDelivery && myCompany?.id === project.deliveringCompanyId;
  const showReviewForm = canReview && myCompany?.id === project.receivingCompanyId;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`People — ${project.name}`}
        description="Assign your company's people to this project. People are managed under My Company; adding someone here lets them see and work on this project."
        back={{ href: `/projects/${id}`, label: "Back to Project" }}
      />

      {showDeliveryForm ? (
        <StaffingCard
          title="Delivery people"
          members={members}
          selectedMemberIds={project.assignedMemberIds}
          action={setProjectStaffing.bind(null, id)}
        />
      ) : null}

      {showReviewForm ? (
        <StaffingCard
          title="Review people"
          members={members}
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
  members,
  selectedMemberIds,
  action,
}: {
  title: string;
  members: CompanyMember[];
  selectedMemberIds: string[];
  action: (formData: FormData) => void;
}) {
  return (
    <Card className="mb-6 p-5">
      <SectionHeading>{title}</SectionHeading>
      {members.length === 0 ? (
        <p className="text-sm text-slate-400">
          Your company has no people yet.{" "}
          <Link href="/team" className="text-blue-600 hover:underline">
            Add people under My Company
          </Link>
          .
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <PeoplePicker members={members} name="memberIds" defaultSelectedIds={selectedMemberIds} />
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
