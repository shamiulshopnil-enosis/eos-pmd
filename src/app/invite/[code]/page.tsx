import { getCurrentUser } from "@/lib/auth";
import { getInvitation, getProject } from "@/lib/data";
import { acceptInvitation } from "@/lib/actions";
import { signOut } from "@/app/login/actions";
import { InviteFlow } from "./InviteFlow";

const ROLE_LABELS: Record<string, string> = {
  owner: "a vendor owner",
  member: "a vendor team member",
  primary: "the primary client contact",
  collaborator: "a client collaborator",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          EOS
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Project invitation</h1>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const invitation = await getInvitation(code);
  if (!invitation || invitation.status !== "pending") {
    return (
      <Shell>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This invitation link is no longer valid. Ask whoever invited you to send a new one.
        </p>
      </Shell>
    );
  }

  const project = await getProject(invitation.projectId);
  const roleLabel = ROLE_LABELS[invitation.proposedRole] ?? invitation.proposedRole;
  const user = await getCurrentUser();

  return (
    <Shell>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        You&apos;ve been invited to <span className="font-medium">{project?.name ?? "a project"}</span> as {roleLabel}.
      </p>

      {user && user.email.toLowerCase() === invitation.email ? (
        <form action={acceptInvitation.bind(null, code)}>
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Accept invitation
          </button>
        </form>
      ) : user ? (
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>
            This invitation is for <span className="font-medium">{invitation.email}</span>, but you&apos;re signed in as{" "}
            <span className="font-medium">{user.email}</span>.
          </p>
          <form action={signOut}>
            <button type="submit" className="text-blue-600 hover:underline">
              Sign out to accept it
            </button>
          </form>
        </div>
      ) : (
        <InviteFlow invitationId={code} email={invitation.email} />
      )}
    </Shell>
  );
}
