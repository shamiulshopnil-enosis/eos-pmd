import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import mongoose, { Connection, Model, Types } from "mongoose";
import type { Readable } from "stream";
import { MODEL } from "../schemas/schemas";
import { ActivityService } from "../activity/activity.service";
import { ProjectsService } from "../projects/projects.service";
import { serializeMilestone, serializeProject } from "../common/serialize";
import { sanitizeMilestoneHtml } from "../common/richtext";
import { MILESTONE_REVIEW_DIMENSION_KEYS, RATING_SELF_CORRECTION_HOURS } from "../common/constants";
import {
  assertPermission,
  canAttachToMilestone,
  canEditMilestone,
  canRateMilestone,
  canSendMilestone,
  isPrimaryContact,
  isVendorOwner,
} from "../common/permissions";
import { optDate, optStr, str, strList } from "../common/input";
import type {
  Milestone,
  MilestoneWithFullProject,
  MilestoneWithProject,
  Project,
  SessionUser,
} from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);
const ATTACHMENT_BUCKET = "milestone_files";
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 MB per file

/** A minimal shape for a Multer in-memory file (no @types/multer dependency). */
export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class MilestonesService {
  constructor(
    @InjectModel(MODEL.Milestone) private readonly milestones: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    private readonly activity: ActivityService,
    private readonly projectsService: ProjectsService,
  ) {}

  private bucket(): mongoose.mongo.GridFSBucket {
    return new mongoose.mongo.GridFSBucket(this.connection.db!, {
      bucketName: ATTACHMENT_BUCKET,
    });
  }

  /**
   * Map assignee emails to a snapshot from the project's (already hydrated)
   * vendor team. Emails that aren't on the vendor team are dropped.
   */
  private resolveAssignees(project: Project, emails: string[]): {
    userId: Types.ObjectId | null;
    email: string;
    name: string | null;
  }[] {
    const byEmail = new Map(project.vendorTeam.map((v) => [v.email.toLowerCase(), v]));
    const seen = new Set<string>();
    const out: { userId: Types.ObjectId | null; email: string; name: string | null }[] = [];
    for (const raw of emails) {
      const email = raw.trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      const member = byEmail.get(email);
      if (!member) continue;
      seen.add(email);
      out.push({
        userId: member.userId && isValidId(member.userId) ? new Types.ObjectId(member.userId) : null,
        email,
        name: member.name ?? null,
      });
    }
    return out;
  }

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
      url: optStr(body, "url"),
      targetDate: optDate(body, "targetDate"),
      assignees: this.resolveAssignees(project, strList(body, "assigneeEmails")),
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
    existing.url = optStr(body, "url");
    existing.targetDate = optDate(body, "targetDate");
    if (body.assigneeEmails !== undefined) {
      existing.assignees = this.resolveAssignees(project, strList(body, "assigneeEmails"));
    }
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

  // --- Client milestone review (Enosis Client Feedback Form, items 1–5) ---

  /**
   * Parse the five review dimensions from the submitted form. Every dimension is
   * required, 1–5. Returns the dimension map plus their average, which becomes
   * `milestone.rating` (the number all scoring runs off).
   */
  private parseReview(body: Record<string, unknown>): {
    ratings: Record<(typeof MILESTONE_REVIEW_DIMENSION_KEYS)[number], number>;
    overall: number;
  } {
    const ratings = {} as Record<(typeof MILESTONE_REVIEW_DIMENSION_KEYS)[number], number>;
    for (const key of MILESTONE_REVIEW_DIMENSION_KEYS) {
      const n = Number.parseInt(String(body[key] ?? ""), 10);
      if (Number.isNaN(n) || n < 1 || n > 5) {
        throw new BadRequestException("Please answer every review question (1–5).");
      }
      ratings[key] = n;
    }
    const values = MILESTONE_REVIEW_DIMENSION_KEYS.map((k) => ratings[k]);
    const overall = values.reduce((a, b) => a + b, 0) / values.length;
    return { ratings, overall };
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
      "Only a client contact on this project can rate milestones.",
    );
    this.projectsService.assertActiveProject(project);

    if (milestone.status !== "sent") {
      throw new BadRequestException("This milestone is not awaiting your review.");
    }
    const { ratings, overall } = this.parseReview(body);
    const now = new Date();
    milestone.ratings = ratings;
    milestone.rating = overall;
    milestone.comment = optStr(body, "comment");
    milestone.status = "reviewed";
    milestone.ratingSubmittedAt = now;
    milestone.reviewedAt = now;
    milestone.reviewedByUserId = new Types.ObjectId(user.id);
    milestone.reviewedByName = user.name ?? null;
    milestone.reviewedByEmail = user.email;
    await milestone.save();
    await this.projectsService.recomputeProjectScore(projectId);
    await this.activity.log({
      projectId,
      milestoneId,
      type: "FEEDBACK_RECEIVED",
      message: `Client reviewed "${milestone.title}" (${overall.toFixed(1)}/5 overall)`,
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
      "Only a client contact on this project can edit this rating.",
    );
    this.projectsService.assertActiveProject(project);

    if (milestone.status !== "reviewed") {
      throw new BadRequestException("This milestone has not been reviewed yet.");
    }
    // Only the person who submitted the rating may change it. Legacy milestones
    // reviewed before reviewer stamping fall back to "any primary contact".
    const isReviewer = milestone.reviewedByUserId
      ? String(milestone.reviewedByUserId) === user.id
      : isPrimaryContact(user, project);
    if (!isReviewer) {
      throw new ForbiddenException("Only the client contact who submitted this rating can change it.");
    }
    const withinWindow =
      milestone.ratingSubmittedAt != null &&
      Date.now() - milestone.ratingSubmittedAt.getTime() <=
        RATING_SELF_CORRECTION_HOURS * 60 * 60 * 1000;
    if (!withinWindow && !milestone.editRequestedByVendor) {
      throw new BadRequestException("The window to change this rating has closed.");
    }
    const { ratings, overall } = this.parseReview(body);
    milestone.ratings = ratings;
    milestone.rating = overall;
    milestone.comment = optStr(body, "comment");
    await milestone.save();
    await this.projectsService.recomputeProjectScore(projectId);
    await this.activity.log({
      projectId,
      milestoneId,
      type: "FEEDBACK_RECEIVED",
      message: `Client updated their review for "${milestone.title}" (${overall.toFixed(1)}/5 overall)`,
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

  // --- Attachments (GridFS-backed, either side can upload) ---

  private async loadMilestoneAndProject(milestoneId: string) {
    if (!isValidId(milestoneId)) throw new NotFoundException("Milestone not found.");
    const milestone = await this.milestones.findById(milestoneId);
    if (!milestone) throw new NotFoundException("Milestone not found.");
    const projectId = String(milestone.projectId);
    const project = await this.projectsService.getProjectOrThrow(projectId);
    return { milestone, project, projectId };
  }

  async addAttachments(
    user: SessionUser,
    milestoneId: string,
    files: UploadedFileLike[],
  ): Promise<{ projectId: string; milestoneId: string }> {
    const { milestone, project, projectId } = await this.loadMilestoneAndProject(milestoneId);
    assertPermission(
      canAttachToMilestone(user, project),
      "You are not on this project, so you cannot attach files.",
    );
    this.projectsService.assertActiveProject(project);
    if (!files || files.length === 0) throw new BadRequestException("No files were uploaded.");

    const bucket = this.bucket();
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new BadRequestException(
          `"${file.originalname}" is larger than the ${Math.round(
            MAX_ATTACHMENT_BYTES / (1024 * 1024),
          )} MB limit.`,
        );
      }
      const fileId = await new Promise<Types.ObjectId>((resolve, reject) => {
        const stream = bucket.openUploadStream(file.originalname, {
          contentType: file.mimetype,
          metadata: { milestoneId, uploadedByUserId: user.id },
        });
        stream.on("error", reject);
        stream.on("finish", () => resolve(stream.id as Types.ObjectId));
        stream.end(file.buffer);
      });
      milestone.attachments.push({
        fileId,
        filename: file.originalname,
        contentType: file.mimetype || "application/octet-stream",
        size: file.size,
        uploadedByUserId: new Types.ObjectId(user.id),
        uploadedByName: user.name ?? null,
        uploadedByEmail: user.email,
        uploadedAt: new Date(),
      });
    }
    await milestone.save();
    await this.activity.log({
      projectId,
      milestoneId,
      type: "RELEASE_UPDATED",
      message: `${files.length} file${files.length === 1 ? "" : "s"} attached to "${milestone.title}"`,
    });
    return { projectId, milestoneId };
  }

  async removeAttachment(
    user: SessionUser,
    milestoneId: string,
    attachmentId: string,
  ): Promise<{ projectId: string; milestoneId: string }> {
    const { milestone, project, projectId } = await this.loadMilestoneAndProject(milestoneId);
    const attachment = milestone.attachments.id(attachmentId);
    if (!attachment) throw new NotFoundException("Attachment not found.");

    const isUploader = String(attachment.uploadedByUserId ?? "") === user.id;
    if (!isUploader && !isVendorOwner(user, project)) {
      throw new ForbiddenException(
        "Only the person who uploaded a file, or a project owner, can remove it.",
      );
    }
    this.projectsService.assertActiveProject(project);

    try {
      await this.bucket().delete(new Types.ObjectId(String(attachment.fileId)));
    } catch {
      // file already gone from GridFS — drop the metadata anyway
    }
    attachment.deleteOne();
    await milestone.save();
    await this.activity.log({
      projectId,
      milestoneId,
      type: "RELEASE_UPDATED",
      message: `Removed "${attachment.filename}" from "${milestone.title}"`,
    });
    return { projectId, milestoneId };
  }

  async getAttachment(
    user: SessionUser,
    milestoneId: string,
    attachmentId: string,
  ): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
    size: number;
  }> {
    const { milestone, project } = await this.loadMilestoneAndProject(milestoneId);
    assertPermission(
      canAttachToMilestone(user, project),
      "You do not have access to this milestone's files.",
    );
    const attachment = milestone.attachments.id(attachmentId);
    if (!attachment) throw new NotFoundException("Attachment not found.");

    const fileId = new Types.ObjectId(String(attachment.fileId));
    const [fileDoc] = await this.bucket()
      .find({ _id: fileId })
      .toArray();
    if (!fileDoc) throw new NotFoundException("File is no longer stored.");

    return {
      stream: this.bucket().openDownloadStream(fileId),
      filename: attachment.filename,
      contentType: attachment.contentType || "application/octet-stream",
      size: attachment.size || fileDoc.length,
    };
  }
}
