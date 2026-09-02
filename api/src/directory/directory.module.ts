import { Module } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CompanyMembersService } from "./company-members.service";
import { CompaniesController } from "./directory.controller";

// Company-model unification PR1: Companies and their members (CompanyMember).
// Replaces the vendor-only VendorMember directory + the global ClientCompany
// directory. Models come from the global DatabaseModule.
@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanyMembersService],
  exports: [CompaniesService, CompanyMembersService],
})
export class DirectoryModule {}
