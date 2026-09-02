import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { MilestonesService } from "./milestones.service";
import { CurrentUser } from "../common/auth.decorators";
import { str } from "../common/input";
import type { SessionUser } from "../common/types";

@Controller("milestones")
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  // --- reads (data.ts) ---

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query("scope") scope?: string,
    @Query("status") status?: string,
  ) {
    const vendorUserId = scope === "vendor" || user.role === "vendor" ? user.id : undefined;
    return this.milestones.listMilestonesWithProject({ status, vendorUserId });
  }

  @Get("count")
  async count(@CurrentUser() user: SessionUser, @Query("scope") scope?: string) {
    const vendorUserId = scope === "vendor" || user.role === "vendor" ? user.id : undefined;
    return { count: await this.milestones.countMilestones(vendorUserId) };
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    const milestone = await this.milestones.getMilestone(id);
    if (!milestone) throw new NotFoundException("Milestone not found.");
    return milestone;
  }

  @Get(":id/detail")
  async detail(@Param("id") id: string) {
    const milestone = await this.milestones.getMilestoneDetail(id);
    if (!milestone) throw new NotFoundException("Milestone not found.");
    return milestone;
  }

  // --- writes (actions.ts) ---

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: Record<string, unknown>) {
    return this.milestones.createMilestone(user, str(body, "projectId"), body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.milestones.updateMilestone(user, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.milestones.deleteMilestone(user, id);
  }

  @Post(":id/send")
  send(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.milestones.sendMilestoneForReview(user, id);
  }

  @Post(":id/reopen")
  reopen(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.milestones.reopenMilestone(user, id);
  }

  @Post(":id/rating")
  submitRating(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.milestones.submitMilestoneRating(user, id, body);
  }

  @Post(":id/rating/edit")
  editRating(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.milestones.editOwnMilestoneRating(user, id, body);
  }

  @Post(":id/request-reconsideration")
  reconsider(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.milestones.requestRatingReconsideration(user, id);
  }
}
