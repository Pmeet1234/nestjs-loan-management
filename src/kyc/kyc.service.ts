import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { Kyc } from './entities/kyc.entity';

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
      throw new BadRequestException({
        success: false,
        statusCode: 404,
        message: 'User not found with the provided mobile number.',
      });
    }
    if (user.kyc) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'KYC already exists. Modification is not allowed.',
      });
    }

    const kyc = this.kycRepository.create({
      adharcard_no,
      pancard_no,
      user,
    });

    await this.kycRepository.save(kyc);

    const maskedAadhar = 'XXXX-XXXX-' + adharcard_no.slice(-4);
    const maskedPan = pancard_no.slice(0, 2) + 'XXXXXX' + pancard_no.slice(-2);
    return {
      success: true,
      statusCode: 201,
      message: 'KYC details added successfully.',
      data: {
        adharcard_no: maskedAadhar,
        pancard_no: maskedPan,
        kycStatus: 'verified',
      },
    };
  }
}
