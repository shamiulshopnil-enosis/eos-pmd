import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY, ROLES_KEY } from "./auth.decorators";
import { verifySessionToken } from "./session";
import type { SessionUser, UserRole } from "./types";

// Verifies the session JWT the Next.js app forwards as `Authorization: Bearer
// <token>`. Attaches the decoded SessionUser to req.user. Registered globally in
// AppModule; opt out per-route with @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const user = await verifySessionToken(token);
    if (user) req.user = user;

    if (isPublic) return true;
    if (!user) throw new ForbiddenException("A valid session is required.");

    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && roles.length > 0 && !roles.includes(user.role)) {
      throw new ForbiddenException("You do not have access to this resource.");
    }

    return true;
  }
}
