import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { EmiService } from './emi.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PayEmiDto } from 'src/auth/dto/pay_emi.dto';
import { EmiHistoryQueryDto } from './dto/emi-history-query.dto';

@Controller('emi')
export class EmiController {
  constructor(private emiService: EmiService) {}

  // ─── POST /emi/pay ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('pay')
  payEmi(@Body() body: PayEmiDto) {
    return this.emiService.payEmi(body);
  }

  // ─── GET /emi/status?loanId=1 ─────────────────────────────────
  @Get('status')
  getEmiStatus(@Query('loanId', ParseIntPipe) loanId: number) {
    return this.emiService.getEmiStatus(loanId);
  }

  // ─── GET /emi/history ─────────────────────────────────────────
  @Get('history')
  getEmiHistory(
    @Query() query: EmiHistoryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.emiService.getEmiHistory(query, res);
  }

  // Generate payment link
  @Post('generate-link')
  generateLink(@Body() body: { loanId: number }) {
    return this.emiService.generatePaymentLink(body.loanId);
  }

  // Public EMI details
  @Get('public/details')
  getDetails(@Query('token') token: string) {
    return this.emiService.getEmiDetailsByToken(token);
  }

  // Public Pay
  @Post('pay-public')
  payPublic(@Body() body: { token: string; amount: number }) {
    return this.emiService.payEmiByToken(body.token, body.amount);
  }
}
