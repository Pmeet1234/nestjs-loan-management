import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { BankService } from './bank.service';
import { CreateBankDto } from 'src/auth/dto/bank.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

@Controller('bank')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  // @Post('add-bank')
  // addBank(@Body() dto: CreateBankDto) {
  //   return this.bankService.addBankDetails(
  //     dto.mobile_no,
  //     dto.account_number,
  //     dto.ifsc_code,
  //     dto.bank_name,
  //   );
  // }
  @UseGuards(JwtAuthGuard)
  @Post('add-bank')
  addBank(@Req() req: RequestWithUser, @Body() dto: CreateBankDto) {
    const mobile_no = req.user.mobile_no;

    return this.bankService.addBankDetails(
      mobile_no,
      dto.account_number,
      dto.ifsc_code,
      dto.bank_name,
    );
  }
}
