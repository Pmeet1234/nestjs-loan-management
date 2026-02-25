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
      relations: ['company'], //load company relation
    });

    if (!user) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'User not found.',
      });
    }

    if (!user.isEmploymentApproved) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Employee not yet approved.',
      });
    }

    if (!user.company) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Company Details not found.',
      });
    }

    const salary = Number(user.company.salary);
    if (requestedAmount < this.MIN_LOAN || requestedAmount > this.MAX_LOAN)
      throw new BadRequestException(
        `Loan amount must be between ₹${this.MIN_LOAN} and ₹${this.MAX_LOAN}`,
      );

    const activeLoan = await this.loanRepository.findOne({
      where: { user: { id: user.id }, status: 'active' },
    });

    if (activeLoan) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: `You already have an active loan (ID: ${activeLoan.id}). Please complete all EMIs first.`,
      });
    }
    // check pending loan
    const pendingLoan = await this.loanRepository.findOne({
      where: { user: { id: user.id }, status: 'pending' },
    });

    if (pendingLoan) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: `You have a pending loan (ID: ${pendingLoan.id}). Please finish it first.`,
      });
    }
    //check default loan
    const defaultedLoan = await this.loanRepository.findOne({
      where: { user: { id: user.id }, status: 'defaulted' },
    });
    //        'Your previous loan was defaulted. You are not eligible for a new loan.',

    if (defaultedLoan) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message:
          'Your previous loan was defaulted. You are not eligible for a new loan.',
      });
    }
    //If salary < 50k --> user eligible for 25% of salary only
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
      amountPaid: 0,
      user,
      status: 'active',
      totalLoansTaken: totalLoansTaken + 1,
    });

    await this.loanRepository.save(loan);

    return {
      success: true,
      statusCode: 201,
      message: 'Loan approved successfully.',
      data: {
        loanId: loan.id,
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
      },
    };
  }
  async getLoanHistory(userId: number): Promise<any> {
    const loans = await this.loanRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    if (!loans || loans.length === 0) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'No loan history found for Use',
      });
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Loan history fetched successfully.',
      data: {
        userId,
        totalLoans: loans.length,
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
      },
    };
  }

  async getLoanReport(
    fromDate?: string,
    toDate?: string,
    status?: string,
    username?: string,
    mobile_no?: string,
  ): Promise<any> {
    //create dynamic query builder
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

    const totalLoanAmount = loans.reduce(
      (sum, l) => sum + Number(l.approvedAmount),
      0,
    );
    const totalAmountPaid = loans.reduce(
      (sum, l) => sum + Number(l.amountPaid),
      0,
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Loan report fetched successfully.',
      data: {
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
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getLoanById(loanId: number): Promise<any> {
    //fetch specific loan with user detail
    const loan = await this.loanRepository
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
        'loan.totalLoansTaken',
        'user.id',
        'user.username',
        'user.mobile_no',
      ])
      .where('loan.id = :loanId', { loanId: Number(loanId) })
      .getOne();

    if (!loan) {
      throw new BadRequestException({
        success: false,
        statusCode: 404,
        message: `Loan with ID ${loanId} not found.`,
      });
    }

    const remainingBalance = parseFloat(
      (Number(loan.totalPayable) - Number(loan.amountPaid)).toFixed(2),
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Loan fetched successfully.',
      data: {
        loanId: loan.id,
        username: loan.user.username,
        mobile_no: loan.user.mobile_no,
        requestedAmount: loan.requestedAmount,
        approvedAmount: loan.approvedAmount,
        totalPayable: loan.totalPayable,
        amountPaid: loan.amountPaid,
        remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
        emiCount: loan.emiCount,
        emiAmount: loan.emiAmount,
        status: loan.status,
        totalLoansTaken: loan.totalLoansTaken,
        createdAt: loan.createdAt,
      },
    };
  }
}
