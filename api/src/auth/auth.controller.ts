import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { InvitationsService } from "../invitations/invitations.service";
import { CurrentUser, Public } from "../common/auth.decorators";
import { signSession, homePathForRole } from "../common/session";
import { str } from "../common/input";
import type { SessionUser } from "../common/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(value: unknown): string | null {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

// Auth lives entirely in the API now. The Next.js app owns only the session
// cookie: it calls these endpoints, then sets/clears `eos_session` with the
// returned token.
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly invitations: InvitationsService,
  ) {}

  @Get("me")
  me(@CurrentUser() user: SessionUser) {
    return user;
  }

  // --- e-mail one-time-code sign in (login/actions.ts) ---

  @Public()
  @Post("login/request-code")
  async requestLoginCode(@Body() body: Record<string, unknown>) {
    const email = str(body, "email").toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false as const, error: "Enter a valid email address." };
    const code = await this.auth.createLoginCode(email);
    return { ok: true as const, email, devCode: code };
  }

  @Public()
  @Post("login/verify-code")
  async verifyLoginCode(@Body() body: Record<string, unknown>) {
    const email = str(body, "email").toLowerCase();
    const code = str(body, "code");
    const next = safeNext(body.next);

    if (!EMAIL_RE.test(email)) return { ok: false as const, error: "Enter a valid email address." };
    if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "Enter the 6-digit code." };

    const ok = await this.auth.verifyLoginCode(email, code);
    if (!ok) return { ok: false as const, error: "That code is invalid or has expired." };

    const user = await this.users.findOrCreate(email);
    const token = await signSession(user);
    return { ok: true as const, token, user, redirectTo: next ?? homePathForRole(user.role) };
  }

  // --- invitation accept, sign-in-and-accept (invite/[code]/actions.ts) ---

  @Public()
  @Post("invite/:id/request-code")
  async requestInviteCode(@Param("id") id: string) {
    const inv = await this.invitations.getInvitation(id);
    if (!inv || inv.status !== "pending") {
      return { ok: false as const, error: "This invitation is no longer valid." };
    }
    const code = await this.auth.createLoginCode(inv.email, "invite");
    return { ok: true as const, devCode: code };
  }

  @Public()
  @Post("invite/:id/accept")
  async acceptWithCode(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const inv = await this.invitations.getInvitation(id);
    if (!inv || inv.status !== "pending") {
      return { ok: false as const, error: "This invitation is no longer valid." };
    }
    const code = str(body, "code");
    if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "Enter the 6-digit code." };

    const ok = await this.auth.verifyLoginCode(inv.email, code, "invite");
    if (!ok) return { ok: false as const, error: "That code is invalid or has expired." };

    const user = await this.users.findOrCreate(
      inv.email,
      inv.kind === "vendor_team" ? "vendor" : "buyer",
    );
    const result = await this.invitations.applyAcceptance(id, user);
    if (!result.ok) return { ok: false as const, error: result.error };

    const token = await signSession(result.sessionUser);
    return { ok: true as const, token, redirectTo: result.redirectTo };
  }

  // --- invitation accept for an already-signed-in user (lib/actions.ts acceptInvitation) ---

  @Post("invitations/:id/accept")
  async accept(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const result = await this.invitations.applyAcceptance(id, user);
    if (!result.ok) return { ok: false as const, error: result.error };
    const token = await signSession(result.sessionUser);
    return { ok: true as const, token, redirectTo: result.redirectTo };
  }
}
