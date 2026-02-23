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

    if (!user.isEmploymentApproved)
      throw new BadRequestException('Employment not approved yet');

    if (!user.company)
      throw new BadRequestException('Company details not found');

    const salary = Number(user.company.salary);
    if (requestedAmount < this.MIN_LOAN || requestedAmount > this.MAX_LOAN)
      throw new BadRequestException(
        `Loan amount must be between ₹${this.MIN_LOAN} and ₹${this.MAX_LOAN}`,
      );

    let eligibleAmount: number;

    if (salary < 50000) {
      eligibleAmount = salary * 0.25;

      // if (requestedAmount > eligibleAmount) {
      //   throw new BadRequestException(`Eligible only for ₹${eligibleAmount}`);
      // }
    } else {
      eligibleAmount = requestedAmount;
    }

    const interestRate = eligibleAmount * this.INTEREST_RATE;
    const total = eligibleAmount + interestRate;

    const emiCount = requestedAmount >= 50000 ? 4 : 3;
    const emiAmount = parseFloat((total / emiCount).toFixed(2));
    const totalRepayment = parseFloat(
      (eligibleAmount + interestRate).toFixed(2),
    );
    const totalLoansTaken = await this.loanRepository.count({
      where: { user: { id: user.id } },
    });
    const loan = this.loanRepository.create({
      requestedAmount,
      approvedAmount: eligibleAmount,
      interestAmount: interestRate,
      totalPayable: total,
      emiCount,
      emiAmount,
      user,
      status: 'active',
    });

    await this.loanRepository.save(loan);
    return {
      message: 'Loan Approved Successfully',
      userId: user.id,
      username: user.username,
      mobile_no: user.mobile_no,
      salary,
      requestedAmount,
      approvedAmount: eligibleAmount,
      interestRate: `${this.INTEREST_RATE * 100}%`,
      totalInterest: interestRate,
      totalPayable: total,
      emiCount,
      emiAmount,
      totalRepayment,
      totalLoansTaken: totalLoansTaken + 1,
      // loans,
      status: 'active',
    };
  }
  async getLoanHistory(userId: number): Promise<any> {
    const loans = await this.loanRepository.find({
      where: { user: { id: userId } },
    });

    if (!loans || loans.length === 0) {
      throw new BadRequestException('No loan history found for this user');
    }

    return {
      message: 'Loan history fetched successfully',
      userId,
      totalLoans: loans.length,
      loans,
    };
  }
}
