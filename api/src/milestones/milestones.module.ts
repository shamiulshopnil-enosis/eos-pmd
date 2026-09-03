import { Module } from "@nestjs/common";
import { MilestonesService } from "./milestones.service";
import { MilestonesController } from "./milestones.controller";
import { ActivityModule } from "../activity/activity.module";
import { ProjectsModule } from "../projects/projects.module";
import { MailerService } from "../common/mailer.service";

@Module({
  imports: [ActivityModule, ProjectsModule],
  controllers: [MilestonesController],
  providers: [MilestonesService, MailerService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
