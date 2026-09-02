import { requireUser } from "@/lib/auth";
import { getMyCompany, listCompanyMembers } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import CompanyManager from "@/components/CompanyManager";

export default async function MyCompanyPage() {
  await requireUser();
  const company = await getMyCompany();
  const members = await listCompanyMembers(company.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="My Company"
        description="Your company's people directory. A person becomes active the first time they sign in with their email, and can then be assigned to any project."
      />
      <CompanyManager company={company} members={members} />
    </div>
  );
}
