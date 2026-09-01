import { describe, it, expect } from "vitest";
import {
  vendorRole,
  clientRole,
  isVendorOwner,
  isVendorMember,
  isPrimaryContact,
  isCollaborator,
  canEditMilestone,
  canManageProject,
  canRateMilestone,
  canRequestCompletion,
  canInviteCollaborator,
  canRequestCapstone,
  canSubmitCapstone,
} from "./permissions";
import type { SessionUser } from "./session";

const owner: SessionUser = { id: "u_owner", email: "owner@v.example", name: null, role: "vendor" };
const member: SessionUser = { id: "u_member", email: "member@v.example", name: null, role: "vendor" };
const primary: SessionUser = { id: "u_primary", email: "primary@c.example", name: null, role: "buyer" };
const collab: SessionUser = { id: "u_collab", email: "collab@c.example", name: null, role: "buyer" };
const stranger: SessionUser = { id: "u_stranger", email: "no@one.example", name: null, role: "buyer" };

const project = {
  vendorTeam: [
    { userId: "u_owner", role: "owner" as const, invitePending: false },
    { userId: "u_member", role: "member" as const, invitePending: false },
    { userId: "u_pending_owner", role: "owner" as const, invitePending: true },
  ],
  clientContacts: [
    { userId: "u_primary", role: "primary" as const, invitePending: false },
    { userId: "u_collab", role: "collaborator" as const, invitePending: false },
  ],
};

describe("role resolution", () => {
  it("maps an accepted member to their role", () => {
    expect(vendorRole(owner, project)).toBe("owner");
    expect(vendorRole(member, project)).toBe("member");
    expect(clientRole(primary, project)).toBe("primary");
    expect(clientRole(collab, project)).toBe("collaborator");
  });

  it("returns null for a null user, a stranger, or a still-pending invite", () => {
    expect(vendorRole(null, project)).toBeNull();
    expect(vendorRole(stranger, project)).toBeNull();
    expect(clientRole(stranger, project)).toBeNull();
    expect(
      vendorRole({ ...stranger, id: "u_pending_owner" }, project),
    ).toBeNull(); // invitePending entries do not count
  });
});

describe("action guards", () => {
  it("milestone edits: any vendor team member, no client", () => {
    expect(canEditMilestone(owner, project)).toBe(true);
    expect(canEditMilestone(member, project)).toBe(true);
    expect(canEditMilestone(primary, project)).toBe(false);
    expect(canEditMilestone(null, project)).toBe(false);
  });

  it("project management + completion + capstone request: vendor owner only", () => {
    for (const guard of [canManageProject, canRequestCompletion, canRequestCapstone]) {
      expect(guard(owner, project)).toBe(true);
      expect(guard(member, project)).toBe(false);
      expect(guard(primary, project)).toBe(false);
    }
  });

  it("rating + capstone submission + inviting collaborators: primary contact only", () => {
    for (const guard of [canRateMilestone, canSubmitCapstone, canInviteCollaborator]) {
      expect(guard(primary, project)).toBe(true);
      expect(guard(collab, project)).toBe(false);
      expect(guard(owner, project)).toBe(false);
    }
  });

  it("exposes the plain predicates too", () => {
    expect(isVendorOwner(owner, project)).toBe(true);
    expect(isVendorMember(member, project)).toBe(true);
    expect(isPrimaryContact(primary, project)).toBe(true);
    expect(isCollaborator(collab, project)).toBe(true);
  });
});
