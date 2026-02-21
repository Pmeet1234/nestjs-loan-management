import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from './entities/company.entity';
import { User } from '../user/entities/user.entity';

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

    const company = this.companyRepository.create({
      company_name,
      salary,
      user,
    });

    await this.companyRepository.save(company);
    user.isEmploymentApproved = true;

    return {
      message: 'Company details added successfully',
      company_name: company.company_name,
      salary: company.salary,
    };
  }
}
