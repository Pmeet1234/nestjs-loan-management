import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { User } from '../user/entities/user.entity';
import { SmsService } from 'src/sms/sms.service';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    private smsService: SmsService,
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

    if (user.company) {
      user.company.company_name = company_name;
      user.company.salary = salary;
      await this.companyRepo.save(user.company);
    } else {
      user.company = this.companyRepo.create({ company_name, salary, user });
      await this.companyRepo.save(user.company);
    }
    user.isEmploymentApproved = true;
    await this.userRepo.save(user);
    try {
      const smsNumber = '9558895075';
      await this.smsService.sendWhatsapp(
        smsNumber,
        `Company details fetched successfully for mobile number ${mobile_no}.`,
      );
    } catch (err) {
      console.error('SMS failed', (err as Error).message);
    }
    return {
      message: 'Company details added (or updated) successfully.',
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
