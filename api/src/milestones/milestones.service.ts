import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { ActivityService } from "../activity/activity.service";
import { ProjectsService } from "../projects/projects.service";
import { serializeMilestone, serializeProject } from "../common/serialize";
import { sanitizeMilestoneHtml } from "../common/richtext";
import { RATING_SELF_CORRECTION_HOURS } from "../common/constants";
import {
  assertPermission,
  canEditMilestone,
  canRateMilestone,
  canSendMilestone,
} from "../common/permissions";
import { optDate, optStr, str } from "../common/input";
import type {
  Milestone,
  MilestoneWithFullProject,
  MilestoneWithProject,
  SessionUser,
} from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

@Injectable()
export class MilestonesService {
  constructor(
    @InjectModel(MODEL.Milestone) private readonly milestones: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
    private readonly activity: ActivityService,
    private readonly projectsService: ProjectsService,
  ) {}

  private async projectIdsForVendor(vendorUserId?: string): Promise<Types.ObjectId[] | null> {
    if (!vendorUserId || !isValidId(vendorUserId)) return null;
    const docs = await this.projects
      .find({ "vendorTeam.userId": new Types.ObjectId(vendorUserId) })
      .select({ _id: 1 })
      .lean();
    return docs.map((d) => d._id as Types.ObjectId);
  }

  // -------------------------------------------------------------------------
  // reads (ported from data.ts)
  // -------------------------------------------------------------------------

  async countMilestones(vendorUserId?: string): Promise<number> {
    const ids = await this.projectIdsForVendor(vendorUserId);
    return this.milestones.countDocuments(ids ? { projectId: { $in: ids } } : {});
  }

  async listMilestonesWithProject(
    filter: { status?: string; vendorUserId?: string } = {},
  ): Promise<MilestoneWithProject[]> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    const ids = await this.projectIdsForVendor(filter.vendorUserId);
    if (ids) query.projectId = { $in: ids };

    const milestoneDocs = await this.milestones.find(query).sort({ updatedAt: -1 }).lean();
    const milestones = milestoneDocs.map((m) => serializeMilestone(m as Record<string, unknown>));

    const projectDocs = await this.projects
      .find({ _id: { $in: milestones.map((m) => m.projectId) } })
      .lean();
    const projectById = new Map(
      projectDocs.map((p) => {
        const project = serializeProject(p as Record<string, unknown>);
        return [project.id, project] as const;
      }),
    );

    return milestones
      .filter((m) => projectById.has(m.projectId))
      .map((m) => {
        const project = projectById.get(m.projectId)!;
        return {
          ...m,
          project: {
            id: project.id,
            name: project.name,
            clientCompanyName: project.clientCompanyName,
          },
        };
      });
  }

  async getMilestone(id: string): Promise<Milestone | null> {
    if (!isValidId(id)) return null;
    const doc = await this.milestones.findById(id).lean();
    return doc ? serializeMilestone(doc as Record<string, unknown>) : null;
  }

  async getMilestoneDetail(id: string): Promise<MilestoneWithFullProject | null> {
    if (!isValidId(id)) return null;
    const milestoneDoc = await this.milestones.findById(id).lean();
    if (!milestoneDoc) return null;
    const milestone = serializeMilestone(milestoneDoc as Record<string, unknown>);

    const projectDoc = await this.projects.findById(milestone.projectId).lean();
    if (!projectDoc) return null;
    return { ...milestone, project: serializeProject(projectDoc as Record<string, unknown>) };
  }

  // -------------------------------------------------------------------------
  // writes (ported from actions.ts)
  // -------------------------------------------------------------------------

  async createMilestone(
    user: SessionUser,
    projectId: string,
    body: Record<string, unknown>,
  ): Promise<{ projectId: string; milestoneId: string }> {
    const project = await this.projectsService.requirePermission(
      projectId,
      user,
      canEditMilestone,
      "You are not a member of this project's vendor team.",
    );
    this.projectsService.assertActiveProject(project);

    const milestone = await this.milestones.create({
      projectId,
      title: str(body, "title"),
      description: sanitizeMilestoneHtml(str(body, "description")),
      targetDate: optDate(body, "targetDate"),
      status: "draft",
    });
    const milestoneId = String(milestone._id);
    await this.projectsService.recomputeProjectScore(projectId);
    await this.activity.log({
      projectId,
      milestoneId,
      type: "RELEASE_CREATED",
      message: `Milestone "${milestone.title}" created`,
    });
    return { projectId, milestoneId };
  }

  async updateMilestone(
    user: SessionUser,
    milestoneId: string,
    body: Record<string, unknown>,
  ): Promise<{ projectId: string; milestoneId: string }> {
    const existing = await this.milestones.findById(milestoneId);
    if (!existing) throw new NotFoundException("Milestone not found.");
    const projectId = String(existing.projectId);

    const project = await this.projectsService.requirePermission(
      projectId,
      user,
      canEditMilestone,
      "You are not a member of this project's vendor team.",
    );
    this.projectsService.assertActiveProject(project);

    if (existing.status === "sent") {
      throw new BadRequestException(
        "This milestone is locked for editing while it is with the client for review.",
      );
    }
    existing.title = str(body, "title");
    existing.description = sanitizeMilestoneHtml(str(body, "description"));
    existing.targetDate = optDate(body, "targetDate");
    await existing.save();
    await this.activity.log({
      projectId,
      milestoneId,
      type: "RELEASE_UPDATED",
      message: "Milestone details updated",
    });
    return { projectId, milestoneId };
  }

  async deleteMilestone(user: SessionUser, milestoneId: string): Promise<{ projectId: string }> {
    const existing = await this.milestones.findById(milestoneId);
    if (!existing) throw new NotFoundException("Milestone not found.");
    const projectId = String(existing.projectId);

    const project = await this.projectsService.requirePermission(
      projectId,
      user,
      canEditMilestone,
      "You are not a member of this project's vendor team.",
    );
    this.projectsService.assertActiveProject(project);

    if (existing.status === "sent") {
      throw new BadRequestException("This milestone is locked while it is with the client for review.");
    }
    if (project.projectType === "whole") {
      throw new BadRequestException("A Whole Project must always keep its single milestone.");
    }
    await this.milestones.findByIdAndDelete(milestoneId);
    await this.projectsService.recomputeProjectScore(projectId);
    await this.activity.log({
      projectId,
      type: "RELEASE_UPDATED",
      message: `Milestone "${existing.title}" removed`,
    });
    return { projectId };
  }

  async sendMilestoneForReview(user: SessionUser, milestoneId: string): Promise<{ projectId: string }> {
    const milestone = await this.milestones.findById(milestoneId);
    if (!milestone) throw new NotFoundException("Milestone not found.");
    const projectId = String(milestone.projectId);

    const project = await this.projectsService.requirePermission(
      projectId,
      user,
      canSendMilestone,
      "You are not a member of this project's vendor team.",
    );
    this.projectsService.assertActiveProject(project);

    if (milestone.status !== "draft") {
      throw new BadRequestException("Only a draft milestone can be sent for review.");
    }
    const sibling = await this.milestones.exists({
      projectId,
      status: "sent",
      _id: { $ne: milestoneId },
    });
    if (sibling) {
      throw new BadRequestException(
        "Another milestone is already with the client. Wait for it to be reviewed first.",
      );
    }
    milestone.status = "sent";
    milestone.sentAt = new Date();
    await milestone.save();
    await this.activity.log({
      projectId,
      milestoneId,
      type: "FEEDBACK_REQUESTED",
      message: `Sent "${milestone.title}" for client review`,
    });
    return { projectId };
  }

  async reopenMilestone(user: SessionUser, milestoneId: string): Promise<{ projectId: string }> {
    const milestone = await this.milestones.findById(milestoneId);
    if (!milestone) throw new NotFoundException("Milestone not found.");
    const projectId = String(milestone.projectId);

    const project = await this.projectsService.requirePermission(
      projectId,
      user,
      canSendMilestone,
      "You are not a member of this project's vendor team.",
    );
    this.projectsService.assertActiveProject(project);

    if (milestone.status === "reviewed") {
      throw new BadRequestException("A reviewed milestone cannot be reopened.");
    }
    if (milestone.status === "draft") return { projectId };

    milestone.status = "draft";
    milestone.sentAt = null;
    await milestone.save();
    await this.activity.log({
      projectId,
      milestoneId,
      type: "RELEASE_UPDATED",
      message: `Recalled "${milestone.title}" from client review`,
    });
    return { projectId };
  }

  // --- Client milestone rating (spec §6.4, §6.5) ---

  private parseRating(body: Record<string, unknown>): number {
    const n = Number.parseInt(String(body.rating ?? ""), 10);
    if (Number.isNaN(n) || n < 1 || n > 5) {
      throw new BadRequestException("Please give a rating from 1 to 5.");
    }
    return n;
  }

  async submitMilestoneRating(
    user: SessionUser,
    milestoneId: string,
    body: Record<string, unknown>,
  ): Promise<{ projectId: string }> {
    const milestone = await this.milestones.findById(milestoneId);
    if (!milestone) throw new NotFoundException("Milestone not found.");
    const projectId = String(milestone.projectId);

    const project = await this.projectsService.requirePermission(
      projectId,
      user,
      canRateMilestone,
      "Only the primary client contact can rate milestones.",
    );
    this.projectsService.assertActiveProject(project);

    if (milestone.status !== "sent") {
      throw new BadRequestException("This milestone is not awaiting your review.");
    }
    const rating = this.parseRating(body);
    const now = new Date();
    milestone.rating = rating;
    milestone.comment = optStr(body, "comment");
    milestone.status = "reviewed";
    milestone.ratingSubmittedAt = now;
    milestone.reviewedAt = now;
    await milestone.save();
    await this.projectsService.recomputeProjectScore(projectId);
    await this.activity.log({
      projectId,
      milestoneId,
      type: "FEEDBACK_RECEIVED",
      message: `Client reviewed "${milestone.title}" (${rating}/5)`,
    });
    return { projectId };
  }

  async editOwnMilestoneRating(
    user: SessionUser,
    milestoneId: string,
    body: Record<string, unknown>,
  ): Promise<{ projectId: string }> {
    const milestone = await this.milestones.findById(milestoneId);
    if (!milestone) throw new NotFoundException("Milestone not found.");
    const projectId = String(milestone.projectId);

    const project = await this.projectsService.requirePermission(
      projectId,
      user,
      canRateMilestone,
      "Only the primary client contact can edit this rating.",
    );
    this.projectsService.assertActiveProject(project);

    if (milestone.status !== "reviewed") {
      throw new BadRequestException("This milestone has not been reviewed yet.");
    }
    const withinWindow =
      milestone.ratingSubmittedAt != null &&
      Date.now() - milestone.ratingSubmittedAt.getTime() <=
        RATING_SELF_CORRECTION_HOURS * 60 * 60 * 1000;
    if (!withinWindow && !milestone.editRequestedByVendor) {
      throw new BadRequestException("The window to change this rating has closed.");
    }
    const rating = this.parseRating(body);
    milestone.rating = rating;
    milestone.comment = optStr(body, "comment");
    await milestone.save();
    await this.projectsService.recomputeProjectScore(projectId);
    await this.activity.log({
      projectId,
      milestoneId,
      type: "FEEDBACK_RECEIVED",
      message: `Client updated their rating for "${milestone.title}" (${rating}/5)`,
    });
    return { projectId };
  }

  async requestRatingReconsideration(
    user: SessionUser,
    milestoneId: string,
  ): Promise<{ projectId: string }> {
    const milestone = await this.milestones.findById(milestoneId);
    if (!milestone) throw new NotFoundException("Milestone not found.");
    const projectId = String(milestone.projectId);

    const project = await this.projectsService.requirePermission(
      projectId,
      user,
      canEditMilestone,
      "You are not a member of this project's vendor team.",
    );
    this.projectsService.assertActiveProject(project);

    if (milestone.status !== "reviewed") {
      throw new BadRequestException("Only a reviewed milestone can be reconsidered.");
    }
    if (milestone.editRequestedByVendor) {
      throw new BadRequestException("A reconsideration has already been requested for this milestone.");
    }
    milestone.editRequestedByVendor = true;
    await milestone.save();
    await this.activity.log({
      projectId,
      milestoneId,
      type: "FEEDBACK_REMINDER_SENT",
      message: `Vendor asked the client to reconsider the rating for "${milestone.title}"`,
    });
    return { projectId };
  }
}
