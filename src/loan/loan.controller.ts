import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  // Get,
  // Param,
  // Query,
  // ParseIntPipe,
  // Res,
} from '@nestjs/common';
// import type { Response } from 'express';
import { LoanService } from './loan.service';
import { UserAuthGuard } from '../user/user-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ApplyLoanDto } from 'src/auth/dto/apply-loan.dto';
// import { AdminJwtGuard } from 'src/admin/admin-jwt.guard';
import { LoanReportQueryDto } from './dto/loan-report-query.dto';

@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}
  @UseGuards(UserAuthGuard)
  @Post('ApplyLoan')
  CreateLoan(@Request() req: RequestWithUser, @Body() body: ApplyLoanDto) {
    return this.loanService.CreateLoan(
      req.user.mobile_no,
      body.requestedAmount,
    );
  }

  @Get('loan-History')
  getLoanHistory(@Query() query: LoanReportQueryDto) {
    console.log('Controller Hit ✅');
    console.log('search:', query);

    return this.loanService.getLoanHistory(query);
  }

  @Get('loan-report')
  getLoanReport(@Query() query: LoanReportQueryDto) {
    return this.loanService.getLoanReport(query);
  }

  @Get('FullLoanReport')
  getFullLoanReport(@Query() query: LoanReportQueryDto) {
    return this.loanService.getFullLoanReport(query);
  }
}
