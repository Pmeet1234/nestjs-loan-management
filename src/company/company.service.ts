import { Injectable, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ProfileStep } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(
    private readonly authService: AuthService,
    private prisma: PrismaService,
  ) {}

  async addCompanyDetails(
    mobile_no: string,
    company_name: string,
    salary: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { mobile_no },
      include: { company: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.profileStep !== ProfileStep.COMPANY) {
      throw new BadRequestException(
        'You already completed This step. Move to next step ',
      );
    }

    await this.prisma.company.create({
      data: {
        company_name,
        salary,
        userId: user.id,
      },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { profileStep: ProfileStep.KYC },
    });

    return {
      message: 'Company details added successfully',
      company: user.company,

      nextStep: ProfileStep.KYC,
    };
  }
}
