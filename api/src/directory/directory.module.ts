import { Module } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CompanyMembersService } from "./company-members.service";
import { TeamsService } from "./teams.service";
import { CompaniesController, TeamsController } from "./directory.controller";

// Company-model unification PR1: Companies, their members (CompanyMember) and Teams.
// Replaces the vendor-only VendorMember directory + the global ClientCompany
// directory. Models come from the global DatabaseModule.
@Module({
  controllers: [CompaniesController, TeamsController],
  providers: [CompaniesService, CompanyMembersService, TeamsService],
  exports: [CompaniesService, CompanyMembersService, TeamsService],
})
export class DirectoryModule {}
