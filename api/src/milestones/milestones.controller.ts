import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { MilestonesService, MAX_ATTACHMENT_BYTES, type UploadedFileLike } from "./milestones.service";
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
    @Query("side") side?: string,
    @Query("status") status?: string,
  ) {
    const userId = user.role === "admin" ? undefined : user.id;
    const s = side === "review" || side === "any" ? side : "delivery";
    return this.milestones.listMilestonesWithProject({ status, userId, side: s });
  }

  @Get("count")
  async count(@CurrentUser() user: SessionUser, @Query("side") side?: string) {
    const userId = user.role === "admin" ? undefined : user.id;
    const s = side === "review" || side === "any" ? side : "delivery";
    return { count: await this.milestones.countMilestones(userId, s) };
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

  @Post(":id/review-draft")
  saveReviewDraft(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.milestones.saveMilestoneReviewDraft(user, id, body);
  }

  @Post(":id/request-reconsideration")
  reconsider(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.milestones.requestRatingReconsideration(user, id);
  }

  @Post(":id/reject")
  reject(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.milestones.rejectMilestone(user, id, body);
  }

  // --- attachments ---

  @Post(":id/attachments")
  @UseInterceptors(FilesInterceptor("files", 10, { limits: { fileSize: MAX_ATTACHMENT_BYTES } }))
  addAttachments(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @UploadedFiles() files: UploadedFileLike[],
  ) {
    return this.milestones.addAttachments(user, id, files ?? []);
  }

  @Delete(":id/attachments/:attachmentId")
  removeAttachment(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
  ) {
    return this.milestones.removeAttachment(user, id, attachmentId);
  }

  @Get(":id/attachments/:attachmentId/raw")
  @Header("Cache-Control", "private, no-store")
  async downloadAttachment(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.milestones.getAttachment(user, id, attachmentId);
    res.set({
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
    });
    return new StreamableFile(file.stream, { length: file.size });
  }
}
