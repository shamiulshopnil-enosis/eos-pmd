import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { isPrimaryContact } from "@/lib/permissions";
import { submitCapstone } from "@/lib/actions";
import { CAPSTONE_ATTRIBUTE_POOL, MAX_CAPSTONE_ATTRIBUTES } from "@/lib/attributes";
import { CAPSTONE_TIER_LABELS } from "@/lib/constants";
import { Card, PageHeader, SectionHeading } from "@/components/ui";
import { Field, SubmitButton, TextArea } from "@/components/form";

export default async function CapstonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("buyer");

  const project = await getProject(id);
  if (!project || !isPrimaryContact(user, project)) notFound();

  const capstone = project.capstone;
  if (!capstone || !capstone.requested) notFound();
  if (capstone.submitted) redirect(`/my-projects/${id}`);

  const pool = CAPSTONE_ATTRIBUTE_POOL[capstone.tier];

  return (
    <div>
      <PageHeader
        title={`Capstone Endorsement — ${project.name}`}
        description="A short qualitative wrap-up of the whole engagement. No star rating here."
        back={{ href: `/my-projects/${id}`, label: "Back to Project" }}
      />

      <Card className="p-6">
        <form action={submitCapstone.bind(null, id)} className="space-y-6">
          <div>
            <SectionHeading>Pick up to {MAX_CAPSTONE_ATTRIBUTES} attributes</SectionHeading>
            <p className="mb-3 text-xs text-slate-400">
              These options reflect the project&apos;s final delivery score ({CAPSTONE_TIER_LABELS[capstone.tier]}).
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pool.map((attr) => (
                <label
                  key={attr}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <input type="checkbox" name="attributes" value={attr} />
                  <span>{attr}</span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Testimonial" required>
            <TextArea
              name="testimonial"
              rows={4}
              required
              placeholder="A few sentences about what it was like working with this vendor."
            />
          </Field>

          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" name="anonymous" className="mt-0.5" />
            <span>Publish this endorsement without my name or company.</span>
          </label>

          <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Submit endorsement</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
