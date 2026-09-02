import { Module } from "@nestjs/common";
import { MilestonesService } from "./milestones.service";
import { MilestonesController } from "./milestones.controller";
import { ActivityModule } from "../activity/activity.module";
import { ProjectsModule } from "../projects/projects.module";

@Module({
  imports: [ActivityModule, ProjectsModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
