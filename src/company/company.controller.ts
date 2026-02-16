import { Controller, Post, Body } from '@nestjs/common';
import { CompanyService } from './company.service';
import { AddCompanyDto } from '../auth/dto/company.dto';
import { AddKycDto } from '../auth/dto/kyc.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('add-company')
  addCompany(@Body() dto: AddCompanyDto) {
    return this.companyService.addCompanyDetails(
      dto.mobile_no,
      dto.company_name,
      dto.salary,
    );
  }

  @Post('add-kyc')
  addKyc(@Body() dto: AddKycDto) {
    return this.companyService.addKycDetails(
      dto.mobile_no,
      dto.adharcard_no,
      dto.pancard_no,
    );
  }
}
