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

    const activeLoan = await this.loanRepository.findOne({
      where: { user: { id: user.id }, status: 'active' },
    });

    if (activeLoan) {
      throw new BadRequestException(
        `You already have an active loan (ID: ${activeLoan.id}). Please complete all EMIs first.`,
      );
    }

    const pendingLoan = await this.loanRepository.findOne({
      where: { user: { id: user.id }, status: 'pending' },
    });

    if (pendingLoan) {
      throw new BadRequestException(
        `You have a pending loan (ID: ${pendingLoan.id}). Please finish it first.`,
      );
    }

    const defaultedLoan = await this.loanRepository.findOne({
      where: { user: { id: user.id }, status: 'defaulted' },
    });

    if (defaultedLoan) {
      throw new BadRequestException(
        'Your previous loan was defaulted. You are not eligible for a new loan.',
      );
    }

    let eligibleAmount: number;
    if (salary < 50000) {
      eligibleAmount = salary * 0.25;
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
      totalLoansTaken: 1,
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
      totalLoansTaken,
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

  async getLoanReport(
    fromDate?: string,
    toDate?: string,
    status?: string,
    username?: string,
    mobile_no?: string,
  ): Promise<any> {
    const query = this.loanRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .select([
        'loan.id',
        'loan.requestedAmount',
        'loan.approvedAmount',
        'loan.totalPayable',
        'loan.amountPaid',
        'loan.emiCount',
        'loan.emiAmount',
        'loan.status',
        'loan.createdAt',
        'user.id',
        'user.username',
        'user.mobile_no',
      ]);

    //  filter by date range
    if (fromDate) {
      query.andWhere('loan.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999); // include full toDate day
      query.andWhere('loan.createdAt <= :toDate', { toDate: to });
    }

    //  filter by status
    if (status) {
      query.andWhere('loan.status = :status', { status });
    }

    //filter by username
    if (username) {
      query.andWhere('user.username ILIKE :username', {
        username: `%${username}%`, // 👈 partial match
      });
    }

    //filter by mobileNo
    if (mobile_no) {
      query.andWhere('user.mobile_no = :mobile_no', { mobile_no });
    }
    query.orderBy('loan.createdAt', 'DESC');

    const loans = await query.getMany();

    if (!loans || loans.length === 0) {
      throw new BadRequestException('No loans found for the given filters');
    }

    //  summary
    const totalLoanAmount = loans.reduce(
      (sum, l) => sum + Number(l.approvedAmount),
      0,
    );
    const totalAmountPaid = loans.reduce(
      (sum, l) => sum + Number(l.amountPaid),
      0,
    );

    return {
      message: 'Loan report fetched successfully',
      totalLoans: loans.length,
      totalLoanAmount,
      totalAmountPaid,
      filters: {
        fromDate: fromDate ?? 'N/A',
        toDate: toDate ?? 'N/A',
        status: status ?? 'all',
        username: username ?? 'all',
        mobile_no: mobile_no ?? 'all',
      },
      loans: loans.map((loan) => ({
        loanId: loan.id,
        username: loan.user.username,
        mobile_no: loan.user.mobile_no,
        requestedAmount: loan.requestedAmount,
        approvedAmount: loan.approvedAmount,
        totalPayable: loan.totalPayable,
        amountPaid: loan.amountPaid,
        emiCount: loan.emiCount,
        emiAmount: loan.emiAmount,
        status: loan.status,
        createdAt: loan.createdAt,
      })),
    };
  }
}
