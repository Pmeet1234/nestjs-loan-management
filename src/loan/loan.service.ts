// import { request } from 'supertest';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  // BadRequestException,
  // NotFoundException,
  // ForbiddenException,
  // ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { Response } from 'express';
import { Loan } from './entities/loan.entity';
import { User } from '../user/entities/user.entity';
import { LoanReportQueryDto } from './dto/loan-report-query.dto';

@Injectable()
export class LoanService {
  private readonly INTEREST_RATE = 0.1;
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
  ) {}

  async CreateLoan(mobile_no: string, requestedAmount: number) {
    const user = await this.userRepo.findOne({
      where: { mobile_no },
      relations: ['company'],
    });

    if (!user)
      throw new NotFoundException({
        message: 'User not found.',
      });

    if (!user.isEmploymentApproved)
      throw new ForbiddenException({
        message: 'Employment not yet approved.',
      });

    if (!user.company)
      throw new NotFoundException({
        message: 'Company details not found.',
      });
    // await this.checkExistingLoan(user.id);

    const salary = Number(user.company.salary);
    const approvedAmount = salary < 50000 ? salary * 0.25 : requestedAmount;
    const interestAmount = approvedAmount * this.INTEREST_RATE;
    const totalPayable = approvedAmount + interestAmount;
    const emiCount = requestedAmount >= 50000 ? 4 : 3;
    const emiAmount = parseFloat((totalPayable / emiCount).toFixed(2));
    const totalLoansTaken = await this.loanRepo.count({
      where: { user: { id: user.id } },
    });

    const loan = this.loanRepo.create({
      requestedAmount,
      approvedAmount,
      interestAmount,
      totalPayable,
      emiCount,
      emiAmount,
      amountPaid: 0,
      user,
      status: 'active',
      totalLoansTaken: totalLoansTaken + 1,
    });
    await this.loanRepo.save(loan);

    return {
      success: true,
      data: {
        loanId: loan.id,
        userId: user.id,
        username: user.username,
        mobile_no: user.mobile_no,
        salary: `₹${salary}`,
        requestedAmount: `₹${requestedAmount}`,
        approvedAmount: `₹${approvedAmount}`,
        interestRate: `${this.INTEREST_RATE * 100}%`,
        interestAmount: `₹${interestAmount}`,
        totalPayable: `₹${totalPayable}`,
        emiCount,
        emiAmount: `₹${emiAmount}`,
        totalLoansTaken,
        status: 'active',
      },
    };
  }
  async getLoanHistory(query: LoanReportQueryDto) {
    const { search } = query;
    console.log('Service Started 🚀');
    console.log(' query:', query);

    const qb = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user');
    // SELECT *FROM loan
    // LEFT JOIN user ON user.id = loan.userId
    // WHERE user.id = 52
    // ORDER BY loan.id ASC;

    if (search) {
      const isNumber = !isNaN(Number(search));
      const IsValidDate = isNumber && Number(search) <= 2147483647;
      qb.andWhere(
        `(
          user.username  ILIKE :search
          OR user.mobile_no = :exactSearch
          ${IsValidDate ? 'OR loan.id = :numSearch' : ''}
          ${IsValidDate ? 'OR user.id = :numSearch' : ''}
        )`,
        {
          search: `%${search}%`,
          exactSearch: search,
          ...(IsValidDate && { numSearch: Number(search) }),
        },
      );
    }
    qb.orderBy('loan.id', 'ASC');
    console.log('Final Query Ready 🚀');
    console.log(qb.getSql()); // 🔥 debug

    const loans = await qb.getMany();
    if (!loans.length) {
      console.log('No loans found ❌');

      throw new NotFoundException({
        message: 'No loan history found.',
      });
    }
    const responseDate = loans.map((l) => ({
      loanId: l.id,
      userId: l.user.id,
      username: l.user.username,
      mobile_no: l.user.mobile_no,
      requestedAmount: `₹${l.requestedAmount}`,
      approvedAmount: `₹${l.approvedAmount}`,
      totalPayable: `₹${l.totalPayable}`,
      emiCount: l.emiCount,
      emiAmount: `₹${l.emiAmount}`,
      status: l.status,
    }));
    return {
      sucess: true,
      data: {
        totalLoans: loans.length,
        loans: responseDate,
      },
    };
  }

  async getLoanReport(query: LoanReportQueryDto) {
    const { search } = query;

    const qb = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user');

    if (search) {
      const isNumber = !isNaN(Number(search));
      const IsValidDate = isNumber && Number(search) <= 2147483647;
      qb.andWhere(
        `(
          user.username  ILIKE :search
          OR user.mobile_no = :exactSearch
          ${IsValidDate ? 'OR loan.id = :numSearch' : ''}
          ${IsValidDate ? 'OR user.id = :numSearch' : ''}
        )`,
        {
          search: `%${search}%`,
          exactSearch: search,
          ...(IsValidDate && { numSearch: Number(search) }),
        },
      );
    }
    qb.orderBy('loan.id', 'ASC');
    const loans = await qb.getMany();

    if (!loans.length) {
      throw new NotFoundException({
        message: 'No loan history found.',
      });
    }

    const Data = loans.map((l) => ({
      loanId: l.id,
      userId: l.user.id,
      username: l.user.username,
      mobile_no: l.user.mobile_no,
      requestedAmount: l.requestedAmount,
      approvedAmount: l.approvedAmount,
      status: l.status,
      totalLoansTaken: l.totalLoansTaken,
    }));

    return {
      message: 'Loan Report',
      data: {
        totalLoans: loans.length,
        loans: Data,
      },
    };
  }

  async getFullLoanReport(query: LoanReportQueryDto) {
    const { search, fromDate, toDate, showAll } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user');

    if (search) {
      const isNumber = !isNaN(Number(search));
      const IsValidDate = isNumber && Number(search) <= 2147483647;
      qb.andWhere(
        `(
        
      user.username ILIKE :search
      or user.mobile_no = :exactMatch
      or loan.status ILIKE :search
          ${IsValidDate ? 'OR loan.id = :numSearch' : ''}
          ${IsValidDate ? 'OR user.id = :numSearch' : ''}
        )`,
        {
          search: `%${search}%`,
          exactMatch: search,
          ...(IsValidDate && { numSearch: Number(search) }),
        },
      );
    }
    if (fromDate) {
      qb.andWhere('loan.createdAt >= :startDate', {
        startDate: new Date(fromDate),
      });
    }

    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999); // full day
      qb.andWhere('loan.createdAt <= :endDate', {
        endDate: end,
      });
    }

    if (showAll !== 'true') {
      const skip = (page - 1) * limit;
      qb.skip(skip).take(limit);
    }

    qb.orderBy('loan.id', 'ASC');
    const [loans, totalCount] = await qb.getManyAndCount();

    const Response = loans.map((l) => ({
      loanId: l.id,
      userId: l.user.id,
      username: l.user.username,
      mobile_no: l.user.mobile_no,
      requestedAmount: l.requestedAmount,
      approvedAmount: l.approvedAmount,
      status: l.status,
      totalLoansTaken: l.totalLoansTaken,
    }));
    const pagination =
      showAll === 'true'
        ? { totalRecords: totalCount, showAll: true }
        : {
            totalRecords: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit,
          };
    return {
      message: 'Loan Report',
      data: {
        pagination,
        totalLoans: Response.length,
        loans: Response,
      },
    };
  }
}
