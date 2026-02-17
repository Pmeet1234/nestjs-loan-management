import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CompanyService } from './company.service';
import { AddCompanyDto } from '../auth/dto/company.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // @Post('add-company')
  // addCompany(@Body() dto: AddCompanyDto) {
  //   return this.companyService.addCompanyDetails(
  //     dto.mobile_no,
  //     dto.company_name,
  //     dto.salary,
  //   );
  // }

  @UseGuards(JwtAuthGuard)
  @Post('add-company')
  addCompany(@Request() req: RequestWithUser, @Body() dto: AddCompanyDto) {
    const mobile_no = req.user.mobile_no;

    return this.companyService.addCompanyDetails(
      mobile_no,
      dto.company_name,
      dto.salary,
    );
  }
}
