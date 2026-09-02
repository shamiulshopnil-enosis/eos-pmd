import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { serializeActivity } from "../common/serialize";
import type { ActivityType, RecentActivity } from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(MODEL.Activity) private readonly activities: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
  ) {}

  /** Ported from actions.ts `logActivity`. */
  async log(params: {
    projectId: string;
    milestoneId?: string | null;
    type: ActivityType;
    message: string;
  }): Promise<void> {
    await this.activities.create({
      projectId: params.projectId,
      milestoneId: params.milestoneId ?? null,
      type: params.type,
      message: params.message,
    });
  }

  private async projectIdsForVendor(vendorUserId?: string): Promise<Types.ObjectId[] | null> {
    if (!vendorUserId || !isValidId(vendorUserId)) return null;
    const docs = await this.projects
      .find({ "vendorTeam.userId": new Types.ObjectId(vendorUserId) })
      .select({ _id: 1 })
      .lean();
    return docs.map((d) => d._id as Types.ObjectId);
  }

  /** Ported from data.ts `recentActivities`. */
  async recent(limit: number, vendorUserId?: string): Promise<RecentActivity[]> {
    const ids = await this.projectIdsForVendor(vendorUserId);
    const query = ids ? { projectId: { $in: ids } } : {};

    const activityDocs = await this.activities.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    const activities = activityDocs.map((a) => serializeActivity(a as Record<string, unknown>));

    const projectDocs = await this.projects
      .find({ _id: { $in: activities.map((a) => a.projectId) } })
      .select({ name: 1 })
      .lean();
    const projectById = new Map(projectDocs.map((p) => [String(p._id), p.name as string] as const));

    return activities
      .filter((a) => projectById.has(a.projectId))
      .map((a) => ({ ...a, project: { id: a.projectId, name: projectById.get(a.projectId)! } }));
  }
}
