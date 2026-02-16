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

    if (salary < 10000) {
      throw new BadRequestException(
        'Not eligible. Salary must be above 10,000',
      );
    }

    user.company = {
      Company_name: company_name,
      salary,
    };

    return {
      message: 'Company details added successfully',
      company: user.company,
    };
  }

  addKycDetails(mobile_no: string, adharcard_no: string, pancard_no: string) {
    const users = this.authService.getAllUsers();
    const user = users.find((u) => u.mobile_no === mobile_no);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.kyc) {
      throw new BadRequestException('KYC already submitted');
    }

    user.kyc = {
      adharcard_no,
      pancard_no,
    };

    return {
      message: 'KYC added successfully',
      kyc: user.kyc,
    };
  }
}
