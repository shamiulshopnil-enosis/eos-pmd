import { Controller, Get, Query } from "@nestjs/common";
import { ActivityService } from "./activity.service";
import { CurrentUser } from "../common/auth.decorators";
import type { SessionUser } from "../common/types";

@Controller("activity")
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  // Mirrors data.ts `recentActivities`. A vendor is scoped to their own
  // projects; admins pass no scope.
  @Get("recent")
  recent(
    @CurrentUser() user: SessionUser,
    @Query("limit") limit?: string,
    @Query("scope") scope?: string,
  ) {
    const n = Math.min(Math.max(Number.parseInt(limit ?? "8", 10) || 8, 1), 50);
    const vendorUserId = user.role === "admin" ? undefined : user.id;
    return this.activity.recent(n, vendorUserId);
  }
}
