import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module";
import { JwtAuthGuard } from "./common/jwt-auth.guard";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ActivityModule } from "./activity/activity.module";
import { ProjectsModule } from "./projects/projects.module";
import { MilestonesModule } from "./milestones/milestones.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ActivityModule,
    ProjectsModule,
    MilestonesModule,
    InvitationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
