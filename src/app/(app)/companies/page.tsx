import { requireUser } from "@/lib/auth";
import { getMyCompany, searchCompanies } from "@/lib/data";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";

export default async function CompaniesPage() {
  await requireUser();
  const [mine, all] = await Promise.all([getMyCompany(), searchCompanies()]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Companies"
        description="Every company in the directory. New client companies are added while creating a project; a contact claims theirs the first time they sign in."
      />

      <Card className="p-5">
        <SectionHeading>Directory ({all.length})</SectionHeading>
        {all.length === 0 ? (
          <p className="text-sm text-slate-400">No companies yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {all.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-100">
                    {o.name}
                    {o.id === mine.id ? (
                      <span className="ml-2">
                        <Badge tone="blue">Yours</Badge>
                      </span>
                    ) : null}
                  </div>
                  {o.primaryContact ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {o.primaryContact.name ? `${o.primaryContact.name} · ` : ""}
                      {o.primaryContact.email}
                    </div>
                  ) : null}
                </div>
                <Badge tone={o.claimed ? "green" : "amber"}>{o.claimed ? "Claimed" : "Unclaimed"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
