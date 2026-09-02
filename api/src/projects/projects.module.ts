import { Module } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { ActivityModule } from "../activity/activity.module";
import { UsersModule } from "../users/users.module";
import { DirectoryModule } from "../directory/directory.module";

@Module({
  imports: [ActivityModule, UsersModule, DirectoryModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
