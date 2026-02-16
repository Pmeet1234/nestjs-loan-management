import { Controller, Post, Body } from '@nestjs/common';
import { BankService } from './bank.service';
import { CreateBankDto } from 'src/auth/dto/bank.dto';

@Controller('bank')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post('add')
  addBank(@Body() dto: CreateBankDto) {
    return this.bankService.addBankDetails(
      dto.mobile_no,
      dto.account_number,
      dto.ifsc_code,
      dto.bank_name,
    );
  }
}
