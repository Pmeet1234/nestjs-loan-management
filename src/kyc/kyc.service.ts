import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Kyc } from './entities/kyc.entity';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Kyc) private kycRepo: Repository<Kyc>,
  ) {}

  // ─── ADD KYC DETAILS ──────────────────────────────────────────
  async addKycDetails(
    mobile_no: string,
    adharcard_no: string,
    pancard_no: string,
  ) {
    const user = await this.userRepo.findOne({
      where: { mobile_no },
      relations: ['kyc'],
    });

    if (!user)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'User not found with the provided mobile number.',
      });

    if (user.kyc)
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'KYC already exists. Modification is not allowed.',
      });

    await this.checkDuplicateKyc(adharcard_no, pancard_no);

    await this.kycRepo.save(
      this.kycRepo.create({ adharcard_no, pancard_no, user }),
    );

    return {
      success: true,
      statusCode: 201,
      message: 'KYC details added successfully.',
      data: {
        adharcard_no: this.maskAadhar(adharcard_no),
        pancard_no: this.maskPan(pancard_no),
        kycStatus: 'verified',
      },
    };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────
  private async checkDuplicateKyc(
    adharcard_no: string,
    pancard_no: string,
  ): Promise<void> {
    const existing = await this.kycRepo
      .createQueryBuilder('kyc')
      .where('kyc.adharcard_no = :adharcard_no', { adharcard_no })
      .orWhere('kyc.pancard_no = :pancard_no', { pancard_no })
      .getOne();

    if (!existing) return;

    if (existing.adharcard_no === adharcard_no)
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Aadhaar number is already registered with another account.',
      });

    if (existing.pancard_no === pancard_no)
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'PAN number is already registered with another account.',
      });
  }

  private maskAadhar(adharcard_no: string): string {
    return 'XXXX-XXXX-' + adharcard_no.slice(-4);
  }

  private maskPan(pancard_no: string): string {
    return pancard_no.slice(0, 2) + 'XXXXXX' + pancard_no.slice(-2);
  }
}
