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

@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // ─── POST /loan/apply-loan ────────────────────────────────────
  @UseGuards(UserAuthGuard)
  @Post('apply-loan')
  applyLoan(@Request() req: RequestWithUser, @Body() body: ApplyLoanDto) {
    return this.loanService.applyLoan(req.user.mobile_no, body.requestedAmount);
  }

  // ─── GET /loan/history?userId=5 ───────────────────────────────
  @Get('history')
  getLoanHistory(@Query('userId') userId: number) {
    return this.loanService.getLoanHistory(userId);
  }

  // ─── GET /loan/report ─────────────────────────────────────────
  //  All query params are optional:
  //  fromDate, toDate, status, username, mobile_no  → filters
  //  page, limit                                    → pagination
  //  showAll=true                                   → skip pagination
  //  download=csv | download=json                   → download file
  @UseGuards(AdminJwtGuard)
  @Get('report')
  getLoanReport(
    @Res({ passthrough: true }) res: Response,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('status') status?: string,
    @Query('username') username?: string,
    @Query('mobile_no') mobile_no?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('showAll') showAll?: string,
    @Query('download') download?: string,
  ) {
    return this.loanService.getLoanReport(
      res,
      fromDate,
      toDate,
      status,
      username,
      mobile_no,
      Number(page),
      Number(limit),
      showAll,
      download,
    );
  }

  // ─── GET /loan/:loanId ────────────────────────────────────────
  @UseGuards(AdminJwtGuard)
  @Get(':loanId')
  getLoanById(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.loanService.getLoanById(loanId);
  }
}
