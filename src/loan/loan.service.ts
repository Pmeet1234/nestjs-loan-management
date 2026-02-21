import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Loan } from './entities/loan.entity';
import { User } from '../user/entities/user.entity';
@Injectable()
export class LoanService {
  private MIN_LOAN = 10000;
  private MAX_LOAN = 100000;
  private INTEREST_RATE = 0.1;

  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,

    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async applyLoan(mobile_no: string, requestedAmount: number) {
    const user = await this.userRepository.findOne({
      where: { mobile_no },
      relations: ['company'],
    });

    if (!user) throw new BadRequestException('User not found');

    // const loans = await this.loanRepository.find({
    //   where: { user: { id: user.id } },
    //   relations: ['user'],
    // });

    if (!user.company)
      throw new BadRequestException('Company details not found');

    const salary = Number(user.company.salary);

    if (salary < 50000) {
      const eligibleAmount = salary * 0.25;

      if (requestedAmount > eligibleAmount) {
        throw new BadRequestException(`Eligible only for ₹${eligibleAmount}`);
      }
    }

    if (requestedAmount < this.MIN_LOAN)
      throw new BadRequestException(`Minimum loan is ₹${this.MIN_LOAN}`);

    if (requestedAmount > this.MAX_LOAN)
      throw new BadRequestException(`Maximum loan is ₹${this.MAX_LOAN}`);

    const interest = requestedAmount * this.INTEREST_RATE;
    const total = requestedAmount + interest;

    const emiCount = requestedAmount >= 50000 ? 4 : 3;
    const emiAmount = total / emiCount;
    const totalLoansTaken = await this.loanRepository.count({
      where: { user: { id: user.id } },
    });
    const loan = this.loanRepository.create({
      requestedAmount,
      approvedAmount: requestedAmount,
      interestAmount: interest,
      totalPayable: total,
      emiCount,
      emiAmount,
      user,
    });

    await this.loanRepository.save(loan);
    return {
      message: 'Loan Approved Successfully',
      userId: user.id,
      username: user.username,
      mobile_no: user.mobile_no,
      approvedAmount: requestedAmount,
      interestAmount: interest,
      totalPayable: total,
      emiCount,
      emiAmount,

      totalLoansTaken,
      // loans,
    };
  }
}
