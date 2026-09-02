import { requireUser } from "@/lib/auth";
import { getMyCompany, listCompanyMembers, listTeams } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import CompanyManager from "@/components/CompanyManager";

export default async function MyCompanyPage() {
  await requireUser();
  const company = await getMyCompany();
  const [members, teams] = await Promise.all([listCompanyMembers(company.id), listTeams()]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="My Company"
        description="Your company's people and teams. Members become active the first time they sign in with their email; a team can be assigned to any project."
      />
      <CompanyManager company={company} members={members} teams={teams} />
    </div>
  );
}
