import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { CurrentUser, Roles } from "../common/auth.decorators";
import type { SessionUser } from "../common/types";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  // --- reads (data.ts) ---

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query("side") side?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
  ) {
    // Admins see everything; everyone else is scoped to projects they're on.
    const userId = user.role === "admin" ? undefined : user.id;
    const s = side === "review" || side === "any" ? side : "delivery";
    return this.projects.listProjectsWithMilestones({ status, q, userId, side: s });
  }

  @Get("count")
  async count(@CurrentUser() user: SessionUser) {
    const userId = user.role === "admin" ? undefined : user.id;
    return { count: await this.projects.countProjects(userId) };
  }

  @Get("mine")
  mine(@CurrentUser() user: SessionUser) {
    return this.projects.listProjectsForUser(user);
  }

  @Get("admin")
  @Roles("admin")
  admin(@Query("adminStatus") adminStatus?: string) {
    return this.projects.listProjectsForAdmin({ adminStatus });
  }

  @Get("awaiting-completion-timeout")
  @Roles("admin")
  awaitingTimeout(@Query("days") days?: string) {
    const n = Number.parseInt(days ?? "7", 10) || 7;
    return this.projects.listProjectsAwaitingCompletionTimeout(n);
  }

  @Get(":id")
  async getOne(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const project = await this.projects.getProject(id, user);
    if (!project) throw new NotFoundException("Project not found.");
    return project;
  }

  @Get(":id/with-milestones")
  async withMilestones(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const project = await this.projects.getProjectWithMilestones(id, user);
    if (!project) throw new NotFoundException("Project not found.");
    return project;
  }

  @Get(":id/detail")
  async detail(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const project = await this.projects.getProjectDetail(id, user);
    if (!project) throw new NotFoundException("Project not found.");
    return project;
  }

  @Get(":id/invitations")
  invitations(@Param("id") id: string) {
    return this.projects.listPendingInvitations(id);
  }

  // --- writes (actions.ts) ---

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: Record<string, unknown>) {
    return this.projects.createProject(user, body);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.projects.updateProject(user, id, body);
    return { ok: true };
  }

  @Post(":id/submit-for-approval")
  async submitForApproval(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.projects.submitForApproval(user, id);
    return { ok: true };
  }

  @Post(":id/approve")
  @Roles("admin")
  async approve(@Param("id") id: string) {
    await this.projects.approveProject(id);
    return { ok: true };
  }

  @Post(":id/reject")
  @Roles("admin")
  async reject(@Param("id") id: string) {
    await this.projects.rejectProject(id);
    return { ok: true };
  }

  @Post(":id/delivery-staffing")
  async setDeliveryStaffing(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.projects.setDeliveryStaffing(user, id, body);
    return { ok: true };
  }

  @Post(":id/review-staffing")
  async setReviewStaffing(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.projects.setReviewStaffing(user, id, body);
    return { ok: true };
  }

  @Post(":id/request-completion")
  async requestCompletion(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.projects.requestCompletion(user, id);
    return { ok: true };
  }

  @Post(":id/confirm-completion")
  async confirmCompletion(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.projects.confirmCompletion(user, id);
    return { ok: true };
  }

  @Post(":id/force-complete")
  @Roles("admin")
  async forceComplete(@Param("id") id: string) {
    await this.projects.forceCompleteProject(id);
    return { ok: true };
  }

  @Post(":id/request-capstone")
  async requestCapstone(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.projects.requestCapstone(user, id);
    return { ok: true };
  }

  @Post(":id/submit-capstone")
  async submitCapstone(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.projects.submitCapstone(user, id, body);
    return { ok: true };
  }

  @Post(":id/publish")
  async publish(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    await this.projects.publishProject(user, id, body);
    return { ok: true };
  }

  @Post(":id/unpublish")
  async unpublish(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.projects.unpublishProject(user, id);
    return { ok: true };
  }

}
