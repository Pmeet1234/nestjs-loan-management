import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
  ) {}

  // ─── ADD COMPANY DETAILS ──────────────────────────────────────
  async addCompanyDetails(
    mobile_no: string,
    company_name: string,
    salary: number,
  ) {
    const user = await this.userRepo.findOne({
      where: { mobile_no },
      relations: ['company'],
    });
    if (!user)
      throw new NotFoundException({
        message: 'User not found with the provided mobile number.',
      });

    await this.companyRepo.save(
      this.companyRepo.create({ company_name, salary, user }),
    );
    user.isEmploymentApproved = true;
    await this.userRepo.save(user);
    return {
      message: 'Company details added successfully.',
      data: {
        company_name,
        salary: `₹${salary}`,
        employmentStatus: 'approved',
      },
    };
  }

  async getCompanyDetails(mobile_no: string) {
    const user = await this.userRepo.find({
      where: { mobile_no },
      relations: ['company'],
    });

    if (!user) throw new NotFoundException({ message: 'User not found' });

    return {
      message: 'Company details fetched successfully.',
      data: {
        users: user.map((user) => ({
          userId: user.id,
          username: user.username,
          mobile_no: user.mobile_no,
          company: {
            company_name: user.company.company_name,
            salary: `₹${user.company.salary}`,
          },
        })),
      },
    };
  }
}
