import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { LoanService } from './loan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ApplyLoanDto } from 'src/auth/dto/apply-loan.dto';

@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @UseGuards(JwtAuthGuard)
  @Post('apply-loan')
  applyLoan(@Request() req: RequestWithUser, @Body() body: ApplyLoanDto) {
    return this.loanService.applyLoan(req.user.mobile_no, body.requestedAmount);
  }
}
