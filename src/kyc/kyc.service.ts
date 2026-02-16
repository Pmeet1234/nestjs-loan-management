import { Injectable, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class KycService {
  constructor(private readonly authService: AuthService) {}

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
