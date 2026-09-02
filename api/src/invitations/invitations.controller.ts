import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { InvitationsService } from "./invitations.service";
import { Public } from "../common/auth.decorators";

@Controller("invitations")
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  // Public: the /invite/[code] page renders before the visitor signs in.
  @Public()
  @Get(":id")
  async getOne(@Param("id") id: string) {
    const inv = await this.invitations.getInvitation(id);
    if (!inv) throw new NotFoundException("Invitation not found.");
    return inv;
  }
}
