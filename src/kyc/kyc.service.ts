import { Injectable, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ProfileStep } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class KycService {
  constructor(
    private readonly authService: AuthService,
    private prisma: PrismaService,
  ) {}

  async addKycDetails(
    mobile_no: string,
    adharcard_no: string,
    pancard_no: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { mobile_no },
      include: { kyc: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.profileStep === ProfileStep.COMPLETED) {
      throw new BadRequestException('KYC already added. You cannot change it.');
    }
    if (user.profileStep !== ProfileStep.KYC) {
      throw new BadRequestException('Complete Company step first');
    }
    await this.prisma.kyc.create({
      data: {
        adharcard_no,
        pancard_no,
        userId: user.id,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { profileStep: ProfileStep.COMPLETED },
    });

    return {
      message: 'KYC added successfully',
      nextStep: user.profileStep,
    };
  }
}
