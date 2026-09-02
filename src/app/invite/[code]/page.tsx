import { getCurrentUser } from "@/lib/auth";
import { getInvitation, getProject } from "@/lib/data";
import { acceptInvitation } from "@/lib/actions";
import { signOut } from "@/app/login/actions";
import { AuthShell } from "@/components/AuthShell";
import { InkButton } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { InviteFlow } from "./InviteFlow";

const ROLE_LABELS: Record<string, string> = {
  owner: "a vendor owner",
  member: "a vendor team member",
  primary: "the primary client contact",
  collaborator: "a client collaborator",
};

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const invitation = await getInvitation(code);
  if (!invitation || invitation.status !== "pending") {
    return (
      <AuthShell title="Project invitation">
        <p className="text-sm text-ink-muted">
          This invitation link is no longer valid. Ask whoever invited you to send a new one.
        </p>
      </AuthShell>
    );
  }

  const project = await getProject(invitation.projectId);
  const roleLabel = ROLE_LABELS[invitation.proposedRole] ?? invitation.proposedRole;
  const user = await getCurrentUser();

  return (
    <AuthShell
      title="Project invitation"
      intro={`You've been invited to ${project?.name ?? "a project"} as ${roleLabel}.`}
    >
      {user && user.email.toLowerCase() === invitation.email ? (
        <form action={acceptInvitation.bind(null, code)}>
          <InkButton type="submit" icon="check">
            Accept invitation
          </InkButton>
        </form>
      ) : user ? (
        <div className="space-y-3 text-sm text-ink-muted">
          <p>
            This invitation is for <span className="font-medium text-ink">{invitation.email}</span>, but
            you&apos;re signed in as <span className="font-medium text-ink">{user.email}</span>.
          </p>
          <form action={signOut}>
            <SubmitButton variant="text">Sign out to accept it</SubmitButton>
          </form>
        </div>
      ) : (
        <InviteFlow invitationId={code} email={invitation.email} />
      )}
    </AuthShell>
  );
}
