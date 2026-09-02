import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CompanyMembersService } from "./company-members.service";
import { CurrentUser } from "../common/auth.decorators";
import type { SessionUser } from "../common/types";

@Controller("companies")
export class CompaniesController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly members: CompanyMembersService,
  ) {}

  @Get()
  list(@CurrentUser() user: SessionUser, @Query("q") q?: string, @Query("scope") scope?: string) {
    if (scope === "search" || q) return this.companies.search(q);
    return this.companies.listMine(user);
  }

  @Get("me")
  async me(@CurrentUser() user: SessionUser, @Query("companyId") companyId?: string) {
    const id = await this.companies.resolveActingCompany(user, companyId);
    return this.companies.getOrThrow(id);
  }

  @Get(":id")
  get(@CurrentUser() _user: SessionUser, @Param("id") id: string) {
    return this.companies.getOrThrow(id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.companies.update(user, id, body);
  }

  // --- members ---

  @Get(":id/members")
  listMembers(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.members.list(user, id);
  }

  @Post(":id/members")
  addMember(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.members.add(user, id, body);
  }

  @Patch(":id/members/:membershipId")
  updateMember(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Param("membershipId") membershipId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.members.update(user, id, membershipId, body);
  }

  @Delete(":id/members/:membershipId")
  async removeMember(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Param("membershipId") membershipId: string,
  ) {
    await this.members.remove(user, id, membershipId);
    return { ok: true };
  }
}
