import { redirect } from "next/navigation";

/**
 * The dedicated project People page is gone — delivery people are managed
 * inline from the "+" on the project header's People cell. Any old link lands
 * back on the project.
 */
export default async function ProjectPeoplePageRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}`);
}
