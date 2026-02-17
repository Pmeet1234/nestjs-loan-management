import { Injectable, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class CompanyService {
  constructor(private readonly authService: AuthService) {}

  addCompanyDetails(mobile_no: string, company_name: string, salary: number) {
    const users = this.authService.getAllUsers();
    const user = users.find((u) => u.mobile_no === mobile_no);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.profileStep !== 'COMPANY') {
      throw new BadRequestException(
        'You already completed This step. Move to next step ',
      );
    }
    user.company = {
      Company_name: company_name,
      salary,
    };

    user.profileStep = 'BANK';

    return {
      message: 'Company details added successfully',
      nextStep: user.profileStep,
      company: user.company,
    };
  }
}
