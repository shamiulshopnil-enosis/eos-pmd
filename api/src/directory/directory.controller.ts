import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { VendorMembersService } from "./vendor-members.service";
import { TeamsService } from "./teams.service";
import { ClientCompaniesService } from "./client-companies.service";
import { CurrentUser } from "../common/auth.decorators";
import type { SessionUser } from "../common/types";

@Controller("vendor-members")
export class VendorMembersController {
  constructor(private readonly members: VendorMembersService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.members.list(user);
  }

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: Record<string, unknown>) {
    return this.members.create(user, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.members.update(user, id, body);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.members.remove(user, id);
    return { ok: true };
  }
}

@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.teams.list(user);
  }

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: Record<string, unknown>) {
    return this.teams.create(user, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.teams.update(user, id, body);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.teams.remove(user, id);
    return { ok: true };
  }
}

@Controller("client-companies")
export class ClientCompaniesController {
  constructor(private readonly companies: ClientCompaniesService) {}

  @Get()
  list(@CurrentUser() user: SessionUser, @Query("q") q?: string) {
    return this.companies.list(user, q);
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.companies.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: Record<string, unknown>) {
    return this.companies.create(user, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.companies.update(user, id, body);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.companies.remove(user, id);
    return { ok: true };
  }
}
