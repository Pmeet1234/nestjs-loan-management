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
        message: 'User not found with the provided mobile number.',
      });

    if (user.kyc)
      throw new ConflictException({
        message: 'KYC already exists. Modification is not allowed.',
      });

    await this.checkDuplicateKyc(adharcard_no, pancard_no);

    await this.kycRepo.save(
      this.kycRepo.create({ adharcard_no, pancard_no, user }),
    );

    return {
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
        message: 'Aadhaar number is already registered with another account.',
      });

    if (existing.pancard_no === pancard_no)
      throw new ConflictException({
        message: 'PAN number is already registered with another account.',
      });
  }

  async getKycDetails(mobile_no: string) {
    const user = await this.userRepo.find({
      where: mobile_no ? { mobile_no } : {},
      relations: ['kyc'],
      order: { id: 'ASC' },
    });
    console.log(user);
    if (!user) throw new NotFoundException({ message: 'User not found' });

    const kycs = user.filter((user) => user.kyc !== null);
    console.log(kycs);
    if (!kycs.length)
      throw new NotFoundException({ message: 'No KYC details found' });

    return {
      message: 'KYC details fetched successfully.',
      data: {
        kycs: kycs.map((user) => ({
          userId: user.id,
          username: user.username,
          mobile_no: user.mobile_no,
          kyc: {
            adharcard_no: user.kyc.adharcard_no,
            pancard_no: user.kyc.pancard_no,
          },
        })),
      },
    };
  }

  private maskAadhar(adharcard_no: string): string {
    return 'XXXX-XXXX-' + adharcard_no.slice(-4);
  }

  private maskPan(pancard_no: string): string {
    return pancard_no.slice(0, 2) + 'XXXXXX' + pancard_no.slice(-2);
  }
}
