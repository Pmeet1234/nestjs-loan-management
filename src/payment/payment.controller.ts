import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('generate-link')
  generateLink(@Body() body: { loanId: number }) {
    return this.paymentService.generatePaymentLink(body.loanId);
  }

  @Get('details')
  getDetails(@Query('token') token: string) {
    return this.paymentService.getEmiDetailsByToken(token);
  }

  @Post('pay')
  pay(@Body() body: { token: string; amount: number }) {
    return this.paymentService.payEmiByToken(body.token, body.amount);
  }
}
