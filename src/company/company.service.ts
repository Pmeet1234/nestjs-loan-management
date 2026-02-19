import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from './entities/company.entity';
import { User } from '../user/entities/user.entity';
import { ProfileStep } from '../user/enums/profile-step.enum';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async addCompanyDetails(
    mobile_no: string,
    company_name: string,
    salary: number,
  ) {
    const user = await this.userRepository.findOne({
      where: { mobile_no },
      relations: ['company'],
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.profileStep !== ProfileStep.COMPANY) {
      throw new BadRequestException(
        'You already completed this step. Move to next step.',
      );
    }

    const company = this.companyRepository.create({
      company_name,
      salary,
      // user,
    });

    await this.companyRepository.save(company);

    user.profileStep = ProfileStep.KYC;
    await this.userRepository.save(user);

    return {
      message: 'Company details added successfully',
      company,
      nextStep: ProfileStep.KYC,
    };
  }
}
