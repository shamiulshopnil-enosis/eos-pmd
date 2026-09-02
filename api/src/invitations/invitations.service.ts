import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { UsersService } from "../users/users.service";
import { serializeInvitation } from "../common/serialize";
import type { Invitation, SessionUser, UserRole } from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

export type AcceptResult =
  | { ok: true; sessionUser: SessionUser; redirectTo: string }
  | { ok: false; error: string };

@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(MODEL.Invitation) private readonly invitations: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
    private readonly users: UsersService,
  ) {}

  async getInvitation(id: string): Promise<Invitation | null> {
    if (!isValidId(id)) return null;
    const doc = await this.invitations.findById(id).lean();
    return doc ? serializeInvitation(doc as Record<string, unknown>) : null;
  }

  /** Ported from the Next.js app's src/lib/invitations.ts. */
  async applyAcceptance(invitationId: string, user: SessionUser): Promise<AcceptResult> {
    if (!isValidId(invitationId)) return { ok: false, error: "This invitation is no longer valid." };

    const inv = await this.invitations.findById(invitationId);
    if (!inv || inv.status !== "pending") {
      return { ok: false, error: "This invitation is no longer valid." };
    }
    if (inv.email !== user.email.trim().toLowerCase()) {
      return { ok: false, error: "This invitation is for a different email address." };
    }

    const project = await this.projects.findById(inv.projectId);
    if (!project) return { ok: false, error: "This project no longer exists." };

    if (inv.kind === "vendor_team") {
      const entry = project.vendorTeam.find((v: any) => v.email === inv.email);
      const role = inv.proposedRole as "owner" | "member";
      if (entry) {
        entry.userId = user.id;
        entry.name = user.name ?? entry.name;
        entry.role = role;
        entry.invitePending = false;
      } else {
        project.vendorTeam.push({
          userId: user.id,
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
      const entry = project.clientContacts.find((c: any) => c.email === inv.email);
      if (entry) {
        entry.userId = user.id;
        entry.name = user.name ?? entry.name;
        entry.role = role;
        if (inv.designation) entry.designation = inv.designation;
        entry.invitePending = false;
      } else {
        project.clientContacts.push({
          userId: user.id,
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

    return {
      ok: true,
      sessionUser: { id: user.id, email: user.email, name: user.name, role: user.role },
      redirectTo: `/projects/${String(project._id)}`,
    };
  }
}
