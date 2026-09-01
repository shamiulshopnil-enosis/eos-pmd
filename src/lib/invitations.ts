// Milestones plan, Phase 3. Shared invitation-acceptance logic, used by both the
// signed-in accept action (lib/actions.ts) and the sign-in-and-accept flow
// (app/invite/[code]/actions.ts). Not a "use server" module — no exported action.

import { connectToDatabase } from "./mongoose";
import { InvitationModel, ProjectModel, UserModel } from "./models";
import type { SessionUser, UserRole } from "./session";

type AcceptResult =
  | { ok: true; sessionUser: SessionUser; redirectTo: string }
  | { ok: false; error: string };

export async function applyInvitationAcceptance(
  invitationId: string,
  user: SessionUser,
): Promise<AcceptResult> {
  await connectToDatabase();

  const inv = await InvitationModel.findById(invitationId);
  if (!inv || inv.status !== "pending") return { ok: false, error: "This invitation is no longer valid." };
  if (inv.email !== user.email.trim().toLowerCase()) {
    return { ok: false, error: "This invitation is for a different email address." };
  }

  const project = await ProjectModel.findById(inv.projectId);
  if (!project) return { ok: false, error: "This project no longer exists." };

  if (inv.kind === "vendor_team") {
    const entry = project.vendorTeam.find((v) => v.email === inv.email);
    const role = inv.proposedRole as "owner" | "member";
    if (entry) {
      entry.userId = user.id as never;
      entry.name = user.name ?? entry.name;
      entry.role = role;
      entry.invitePending = false;
    } else {
      project.vendorTeam.push({
        userId: user.id as never,
        email: inv.email,
        name: user.name,
        role,
        invitePending: false,
      });
    }
  } else {
    const role = inv.proposedRole as "primary" | "collaborator";
    if (role === "primary") {
      for (const c of project.clientContacts) {
        if (c.role === "primary" && c.email !== inv.email) c.role = "collaborator";
      }
    }
    const entry = project.clientContacts.find((c) => c.email === inv.email);
    if (entry) {
      entry.userId = user.id as never;
      entry.name = user.name ?? entry.name;
      entry.role = role;
      if (inv.designation) entry.designation = inv.designation;
      entry.invitePending = false;
    } else {
      project.clientContacts.push({
        userId: user.id as never,
        email: inv.email,
        name: user.name,
        designation: inv.designation ?? "",
        role,
        invitePending: false,
      });
    }
  }

  await project.save();
  inv.status = "accepted";
  await inv.save();

  // A person invited onto a vendor team needs the vendor workspace.
  let role: UserRole = user.role;
  if (inv.kind === "vendor_team" && user.role === "buyer") {
    role = "vendor";
    await UserModel.updateOne({ _id: user.id }, { $set: { role: "vendor" } });
  }

  return {
    ok: true,
    sessionUser: { id: user.id, email: user.email, name: user.name, role },
    redirectTo: inv.kind === "vendor_team" ? `/projects/${String(project._id)}` : "/my-projects",
  };
}
