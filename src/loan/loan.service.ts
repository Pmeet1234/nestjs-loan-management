/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { Loan } from './entities/loan.entity';
import { User } from '../user/entities/user.entity';
import { LoanReportQueryDto } from './dto/loan-report-query.dto';

@Injectable()
export class LoanService {
  private readonly INTEREST_RATE = 0.1;

  constructor(
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // ─── APPLY LOAN ───────────────────────────────────────────────
  async applyLoan(mobile_no: string, requestedAmount: number) {
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

    await this.checkExistingLoan(user.id);

    const salary = Number(user.company.salary);
    const approvedAmount = salary < 50000 ? salary * 0.25 : requestedAmount;
    const interestAmount = approvedAmount * this.INTEREST_RATE;
    const totalPayable = approvedAmount + interestAmount;
    const emiCount = requestedAmount >= 50000 ? 4 : 3;
    const emiAmount = parseFloat((totalPayable / emiCount).toFixed(2));
    const totalLoansTaken = await this.loanRepo.count({
      where: { user: { id: user.id } },
    });

    const loan = await this.loanRepo.save(
      this.loanRepo.create({
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
      }),
    );

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

  // ─── LOAN HISTORY ─────────────────────────────────────────────
  async getLoanHistory(userId: number) {
    const loans = await this.loanRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { id: 'ASC' },
    });

    if (!loans.length)
      throw new NotFoundException({
        message: 'No loan history found.',
      });

    return {
      message: 'Loan history fetched successfully.',
      data: {
        userId,
        totalLoans: loans.length,
        loans: loans.map((l) => ({
          loanId: l.id,
          username: l.user.username,
          mobile_no: l.user.mobile_no,
          requestedAmount: `₹${l.requestedAmount}`,
          approvedAmount: `₹${l.approvedAmount}`,
          totalPayable: `₹${l.totalPayable}`,
          amountPaid: `₹${l.amountPaid}`,
          emiCount: l.emiCount,
          emiAmount: `₹${l.emiAmount}`,
          status: l.status,
          createdAt: this.formatDate(l.createdAt),
        })),
      },
    };
  }

  // ─── LOAN REPORT (pagination + download) ─────────────────────
  async getLoanReport(res: Response, query: LoanReportQueryDto) {
    const { fromDate, toDate, showAll, download, search } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    // ─── Build loan query (no pagination here) ────────────────────
    const qb = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .select([
        'loan.id',
        'loan.requestedAmount',
        'loan.approvedAmount',
        'loan.interestAmount',
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
      ]);

    // ─── Single search: userId, loanId, status, username, mobile_no ─
    if (search) {
      const isNumber = !isNaN(Number(search));
      const isValidId = isNumber && Number(search) <= 2147483647;
      qb.andWhere(
        `(
          user.username  ILIKE :search
          OR user.mobile_no = :exactSearch
          OR loan.status    ILIKE :search
          ${isValidId ? 'OR loan.id  = :numSearch' : ''}
          ${isValidId ? 'OR user.id  = :numSearch' : ''}
        )`,
        {
          search: `%${search}%`,
          exactSearch: search,
          ...(isValidId && { numSearch: Number(search) }),
        },
      );
    }

    // ─── Loan Created Date Filter ─────────────────────────────────
    if (fromDate)
      qb.andWhere('loan.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('loan.createdAt <= :toDate', { toDate: to });
    }

    qb.orderBy('loan.id', 'ASC');

    const loans = await qb.getMany();

    if (!loans.length)
      throw new BadRequestException({
        message: 'No loans found for the given filters.',
      });

    // ─── Apply pagination AFTER all filters ───────────────────────
    const totalCount = loans.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedLoans =
      showAll === 'true'
        ? loans
        : loans.slice((page - 1) * limit, page * limit);

    const loanList = paginatedLoans.map((l) => ({
      loanId: l.id,
      userId: l.user.id, // ✅ added
      username: l.user.username, // ✅ added
      mobile_no: l.user.mobile_no, // ✅ added
      requestedAmount: `₹${l.requestedAmount}`,
      approvedAmount: `₹${l.approvedAmount}`,
      interestAmount: `₹${l.interestAmount}`,
      totalPayable: `₹${l.totalPayable}`,
      amountPaid: `₹${l.amountPaid}`,
      remainingBalance: `₹${this.calcRemainingBalance(l.totalPayable, l.amountPaid)}`,
      emiCount: l.emiCount,
      emiAmount: `₹${l.emiAmount}`,
      status: l.status,
      createdAt: this.formatDate(l.createdAt), // ✅ formatted
    }));

    const pagination =
      showAll === 'true'
        ? { totalRecords: totalCount, totalPages: 1, showAll: true }
        : { totalRecords: totalCount, totalPages, currentPage: page, limit };

    const responseData = {
      message: 'Loan report fetched successfully.',
      data: { pagination, totalLoans: loanList.length, loans: loanList },
    };

    if (download === 'csv') return this.downloadLoanCsv(loanList, res);
    if (download === 'json') return this.downloadJson(responseData, res);

    return responseData;
  }

  // ─── GET LOAN BY ID ───────────────────────────────────────────
  async getLoanById(loanId: number) {
    const loan = await this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .select([
        'loan.id',
        'loan.requestedAmount',
        'loan.approvedAmount',
        'loan.interestAmount',
        'loan.totalPayable',
        'loan.amountPaid',
        'loan.emiCount',
        'loan.emiAmount',
        'loan.status',
        'loan.totalLoansTaken',
        'loan.createdAt',
        'user.id',
        'user.username',
        'user.mobile_no',
      ])
      .where('loan.id = :loanId', { loanId })
      .getOne();

    if (!loan)
      throw new NotFoundException({
        message: `Loan ID ${loanId} not found.`,
      });

    return {
      message: 'Loan fetched successfully.',
      data: {
        loanId: loan.id,
        userId: loan.user.id,
        username: loan.user.username,
        mobile_no: loan.user.mobile_no,
        requestedAmount: `₹${loan.requestedAmount}`,
        approvedAmount: `₹${loan.approvedAmount}`,
        interestAmount: `₹${loan.interestAmount}`,
        totalPayable: `₹${loan.totalPayable}`,
        amountPaid: `₹${loan.amountPaid}`,
        remainingBalance: `₹${this.calcRemainingBalance(loan.totalPayable, loan.amountPaid)}`,
        emiCount: loan.emiCount,
        emiAmount: `₹${loan.emiAmount}`,
        status: loan.status,
        totalLoansTaken: loan.totalLoansTaken,
        createdAt: this.formatDate(loan.createdAt),
      },
    };
  }

  // ─── PRIVATE: CHECK EXISTING LOAN ────────────────────────────
  private async checkExistingLoan(userId: number): Promise<void> {
    const existing = await this.loanRepo.findOne({
      where: [
        { user: { id: userId }, status: 'active' },
        { user: { id: userId }, status: 'pending' },
        { user: { id: userId }, status: 'defaulted' },
      ],
    });

    if (existing?.status === 'active')
      throw new ConflictException({
        message: `Active loan exists (ID: ${existing.id}). Complete all EMIs first.`,
      });

    if (existing?.status === 'pending')
      throw new ConflictException({
        message: `Pending loan exists (ID: ${existing.id}). Finish it first.`,
      });

    if (existing?.status === 'defaulted')
      throw new ForbiddenException({
        message: 'Previous loan defaulted. Not eligible for new loan.',
      });
  }

  // ─── PRIVATE: FORMAT DATE ─────────────────────────────────────
  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    return new Date(date)
      .toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .replace(/ /g, '-'); // e.g. 04-Mar-2024
  }

  // ─── PRIVATE: CALC REMAINING BALANCE ─────────────────────────
  private calcRemainingBalance(
    totalPayable: number,
    amountPaid: number,
  ): number {
    return Math.max(
      parseFloat((Number(totalPayable) - Number(amountPaid)).toFixed(2)),
      0,
    );
  }

  // ─── PRIVATE: CSV DOWNLOAD ────────────────────────────────────
  private downloadLoanCsv(loans: any[], res: Response): void {
    const headers = [
      'Loan ID',
      'User ID',
      'Username',
      'Mobile No',
      'Requested Amount',
      'Approved Amount',
      'Interest Amount',
      'Total Payable',
      'Amount Paid',
      'Remaining Balance',
      'EMI Count',
      'EMI Amount',
      'Status',
      'Created At',
    ];

    const rows = loans.map((l) =>
      [
        l.loanId,
        l.userId,
        l.username,
        l.mobile_no,
        l.requestedAmount,
        l.approvedAmount,
        l.interestAmount,
        l.totalPayable,
        l.amountPaid,
        l.remainingBalance,
        l.emiCount,
        l.emiAmount,
        l.status,
        l.createdAt,
      ].map(String),
    );

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const filename = `loan-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── PRIVATE: JSON DOWNLOAD ───────────────────────────────────
  private downloadJson(data: any, res: Response): void {
    const filename = `loan-report-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }
}
