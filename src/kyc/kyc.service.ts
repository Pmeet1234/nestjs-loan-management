import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { Kyc } from './entities/kyc.entity';
import { ProfileStep } from '../user/enums/profile-step.enum';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Kyc)
    private kycRepository: Repository<Kyc>,
  ) {}

  async addKycDetails(
    mobile_no: string,
    adharcard_no: string,
    pancard_no: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { mobile_no },
      relations: ['kyc'],
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

    const kyc = this.kycRepository.create({
      adharcard_no,
      pancard_no,
      user,
    });

    await this.kycRepository.save(kyc);

    user.profileStep = ProfileStep.LOAN;
    await this.userRepository.save(user);

    return {
      message: 'KYC added successfully',
      adharcard_no: kyc.adharcard_no,
      pancard_no: kyc.pancard_no,
      nextStep: ProfileStep.LOAN,
    };
  }
}
