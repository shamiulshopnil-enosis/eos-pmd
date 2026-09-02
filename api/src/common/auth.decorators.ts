import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { SessionUser, UserRole } from "./types";

// Routes marked @Public() skip the JWT guard (e.g. viewing an invitation before
// signing in). Everything else needs a valid forwarded session token.
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// @Roles("admin") — enforced by RolesGuard after the JWT guard has run.
export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// @CurrentUser() -> the SessionUser the JWT guard attached. `{ optional: true }`
// returns null instead of throwing when there is no user (public routes).
export const CurrentUser = createParamDecorator(
  (data: { optional?: boolean } | undefined, ctx: ExecutionContext): SessionUser | null => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    if (!req.user) {
      if (data?.optional) return null;
      throw new UnauthorizedException("Not signed in.");
    }
    return req.user;
  },
);
