import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { canManageReview } from "@/lib/permissions";
import { submitCapstone } from "@/lib/actions";
import { CAPSTONE_ATTRIBUTE_POOL, MAX_CAPSTONE_ATTRIBUTES } from "@/lib/attributes";
import { CAPSTONE_TIER_LABELS } from "@/lib/constants";
import { Card, PageHeader, SectionHeading } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { Field, SubmitButton, TextArea } from "@/components/form";
import { CheckboxGroup, SingleCheckbox } from "@/components/CheckboxField";
import { SetBreadcrumb } from "@/components/Breadcrumbs";

export default async function CapstonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();

  const project = await getProject(id);
  if (!project || !canManageReview(project)) notFound();

  const capstone = project.capstone;
  if (!capstone || !capstone.requested) notFound();
  if (capstone.submitted) redirect(`/projects/${id}`);

  const pool = CAPSTONE_ATTRIBUTE_POOL[capstone.tier];

  return (
    <div>
      <SetBreadcrumb entries={{ [`/projects/${id}`]: project.name }} />
      <PageHeader
        title={`Capstone Endorsement: ${project.name}`}
        description="A short qualitative wrap-up of the whole engagement. No star rating here."
        back={{ href: `/projects/${id}`, label: "Back to Project" }}
      />

      <Card className="p-6">
        <ActionForm action={submitCapstone.bind(null, id)} className="space-y-6">
          <div>
            <SectionHeading>Pick up to {MAX_CAPSTONE_ATTRIBUTES} attributes</SectionHeading>
            <p className="mb-3 text-xs text-ink-muted">
              These options reflect the project&apos;s final delivery score ({CAPSTONE_TIER_LABELS[capstone.tier]}).
            </p>
            <CheckboxGroup name="attributes" options={pool} />
          </div>

          <Field label="Testimonial" required>
            <TextArea
              name="testimonial"
              rows={4}
              required
              placeholder="A few sentences about what it was like working with this vendor."
            />
          </Field>

          <SingleCheckbox name="anonymous">
            Publish this endorsement without my name or company.
          </SingleCheckbox>

          <div className="border-t border-rule pt-5">
            <SubmitButton>Submit endorsement</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
