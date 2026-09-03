import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyCompany, getProject, listCompanyMembers } from "@/lib/data";
import { canManageDeliveryStaffing, canManageReview } from "@/lib/permissions";
import { addCompanyPerson, setProjectStaffing, setReviewStaffing } from "@/lib/actions";
import type { CompanyMember } from "@/lib/types";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { ActionForm } from "@/components/ActionForm";
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
        description="Search your company's directory to add people to this project. Only the people you add here are listed as the project team; your company's owners and admins can always see it."
        back={{ href: `/projects/${id}`, label: "Back to project" }}
      />

      {showDeliveryForm && myCompany ? (
        <StaffingCard
          title="Delivery team"
          companyId={myCompany.id}
          members={members}
          selectedMemberIds={project.assignedMemberIds}
          action={setProjectStaffing.bind(null, id)}
        />
      ) : (
        <Card className="mb-6">
          <SectionHeading>Delivery team</SectionHeading>
          {project.vendorTeam.length === 0 ? (
            <p className="text-sm text-ink-muted">No delivery people assigned yet.</p>
          ) : (
            <PeopleList people={project.vendorTeam} leadTone="owner" />
          )}
        </Card>
      )}

      {showReviewForm && myCompany ? (
        <StaffingCard
          title="Client contacts"
          companyId={myCompany.id}
          members={members}
          selectedMemberIds={project.receivingMemberIds}
          action={setReviewStaffing.bind(null, id)}
        />
      ) : (
        <Card>
          <SectionHeading>Client contacts</SectionHeading>
          {project.clientContacts.length === 0 ? (
            <p className="text-sm text-ink-muted">The client company has not staffed this project yet.</p>
          ) : (
            <PeopleList people={project.clientContacts} leadTone="primary" />
          )}
        </Card>
      )}
    </div>
  );
}

function StaffingCard({
  title,
  companyId,
  members,
  selectedMemberIds,
  action,
}: {
  title: string;
  companyId: string;
  members: CompanyMember[];
  selectedMemberIds: string[];
  action: (formData: FormData) => void;
}) {
  return (
    <Card className="mb-6">
      <SectionHeading>{title}</SectionHeading>
      {members.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Your company has no people yet.{" "}
          <Link href="/team" className="text-link hover:underline">
            Add people under My Company
          </Link>
          .
        </p>
      ) : (
        <ActionForm action={action} success="People updated." className="space-y-3">
          <PeoplePicker
            directory={members}
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
    <ul className="divide-y divide-rule text-sm">
      {people.map((p) => (
        <li key={p.email} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <span className="text-ink">
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
