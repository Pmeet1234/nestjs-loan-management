import { Controller, Get, Query } from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
// import { AdminJwtGuard } from 'src/admin/admin-jwt.guard';
import { UserLoanEmiReportDto } from './dto/user-loan-emi-report.dto';
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // @UseGuards(AdminJwtGuard)
  @Get('user-loan-emi')
  getAllUserLoanAndEmiData(
    @Query() filters: UserLoanEmiReportDto,
    // @Res({ passthrough: true }) res: Response,
  ) {
    return this.reportService.getAllUserLoanAndEmiData(filters);
  }
}
