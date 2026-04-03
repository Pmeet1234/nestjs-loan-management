import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';

import { CompanyService } from './company.service';
import { AddCompanyDto } from '../auth/dto/company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add-company')
  addCompany(@Request() req: RequestWithUser, @Body() body: AddCompanyDto) {
    const mobile_no = req.user.mobile_no;

    return this.companyService.addCompanyDetails(
      mobile_no,
      body.company_name,
      body.salary,
    );
  }

  @Get('companyDetail')
  getCompanyDetails(@Query('mobile_no') mobile_no: string) {
    return this.companyService.getCompanyDetails(mobile_no);
  }
}
