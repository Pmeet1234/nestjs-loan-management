import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { LoanService } from './loan.service';
import { UserAuthGuard } from '../user/user-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ApplyLoanDto } from 'src/auth/dto/apply-loan.dto';
import { AdminJwtGuard } from 'src/admin/admin-jwt.guard';

@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @UseGuards(UserAuthGuard)
  @Post('apply-loan')
  applyLoan(@Request() req: RequestWithUser, @Body() body: ApplyLoanDto) {
    return this.loanService.applyLoan(req.user.mobile_no, body.requestedAmount);
  }

  @Get('history/:userId')
  getLoanHistory(@Param('userId') userId: number) {
    return this.loanService.getLoanHistory(userId);
  }

  @UseGuards(AdminJwtGuard)
  @Get('report')
  getLoanReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('status') status?: string,
    @Query('username') username?: string,
    @Query('mobile_no') mobile_no?: string,
  ) {
    return this.loanService.getLoanReport(
      fromDate,
      toDate,
      status,
      username,
      mobile_no,
    );
  }
  @UseGuards(AdminJwtGuard)
  @Get(':loanId')
  getLoanById(@Param('loanId') loanId: number) {
    return this.loanService.getLoanById(loanId);
  }
}

// **How to use in Postman:**

// Filter by date range:
// ```
// GET /loan/report?fromDate=2026-01-01&toDate=2026-03-01
// Authorization: Bearer <admin_token>
// ```

// Filter by status:
// ```
// GET /loan/report?status=active
// Authorization: Bearer <admin_token>
// ```

// Filter by both:
// ```
// GET /loan/report?fromDate=2026-01-01&toDate=2026-03-01&status=completed
// Authorization: Bearer <admin_token>
// ```

// Filter by username:
// ```
// GET /loan/report?username=Rohit
// Authorization: Bearer <admin_token>
// ```

// Filter by mobile number:
// ```
// GET /loan/report?mobile_no=9898502640
// Authorization: Bearer <admin_token>

// ```
// // Get all loans:
// // ```
// GET /loan/report
// Authorization: Bearer <admin_token>
