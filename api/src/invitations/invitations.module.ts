import { Module } from "@nestjs/common";
import { InvitationsService } from "./invitations.service";
import { InvitationsController } from "./invitations.controller";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
