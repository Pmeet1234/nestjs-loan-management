import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { LoanService } from './loan.service';
import { UserAuthGuard } from '../user/user-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ApplyLoanDto } from 'src/auth/dto/apply-loan.dto';
import { AdminJwtGuard } from 'src/admin/admin-jwt.guard';
import { LoanReportQueryDto } from './dto/loan-report-query.dto';

@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // ─── POST /loan/apply-loan
  @UseGuards(UserAuthGuard)
  @Post('apply-loan')
  applyLoan(@Request() req: RequestWithUser, @Body() body: ApplyLoanDto) {
    return this.loanService.applyLoan(req.user.mobile_no, body.requestedAmount);
  }

  // ─── GET /loan/history?userId=5
  @Get('history')
  getLoanHistory(@Query('userId', ParseIntPipe) userId: number) {
    return this.loanService.getLoanHistory(userId);
  }

  // ─── GET /loan/report
  @UseGuards(AdminJwtGuard)
  @Get('report')
  getLoanReport(
    @Res({ passthrough: true }) res: Response,
    @Query() query: LoanReportQueryDto,
  ) {
    return this.loanService.getLoanReport(res, query);
  }

  // ─── GET /loan/:loanId
  @UseGuards(AdminJwtGuard)
  @Get(':loanId')
  getLoanById(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.loanService.getLoanById(loanId);
  }
}
