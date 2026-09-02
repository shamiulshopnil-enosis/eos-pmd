import { Module } from "@nestjs/common";
import { VendorMembersService } from "./vendor-members.service";
import { TeamsService } from "./teams.service";
import { ClientCompaniesService } from "./client-companies.service";
import {
  ClientCompaniesController,
  TeamsController,
  VendorMembersController,
} from "./directory.controller";

// Team Management feature: the vendor-owned people directory (VendorMember),
// named Teams over it, and the global ClientCompany directory. Models come from
// the global DatabaseModule.
@Module({
  controllers: [VendorMembersController, TeamsController, ClientCompaniesController],
  providers: [VendorMembersService, TeamsService, ClientCompaniesService],
  exports: [VendorMembersService, TeamsService, ClientCompaniesService],
})
export class DirectoryModule {}
