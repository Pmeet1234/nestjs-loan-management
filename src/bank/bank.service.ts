import { Injectable, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class BankService {
  constructor(private readonly authService: AuthService) {}

  addBankDetails(
    mobile_no: string,
    account_number: string,
    ifsc_code: string,
    bank_name: string,
  ) {
    const users = this.authService.getAllUsers();
    const user = users.find((u) => u.mobile_no === mobile_no);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.bank) {
      throw new BadRequestException('Bank details already added');
    }

    if (user.profileStep !== 'BANK') {
      throw new BadRequestException('Complete Company details first');
    }
    user.bank = {
      account_number,
      ifsc_code,
      bank_name,
    };
    user.profileStep = 'KYC';
    return {
      message: 'Bank details added successfully',
      nextStep: user.profileStep,
      bank: user.bank,
    };
  }
}
