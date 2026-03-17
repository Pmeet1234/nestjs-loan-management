/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { User } from '../user/entities/user.entity';
import { Loan } from '../loan/entities/loan.entity';
import { EmiPayment } from '../emi/entities/emi-payment.entity';
import { UserLoanEmiReportDto } from './dto/user-loan-emi-report.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    @InjectRepository(EmiPayment) private emiRepo: Repository<EmiPayment>,
  ) {}

  // ─── GET ALL USER LOAN AND EMI DATA ───────────────────────────
  async getAllUserLoanAndEmiData(filters: UserLoanEmiReportDto, res: Response) {
    const { startDate, endDate, emiNumber, showAll, download, search } =
      filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;

    // ─── Build loan query (no pagination here) ────────────────────
    const qb = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user');

    // ─── Single search across username, mobile_no, loanId, status ─
    if (search) {
      const isNumber = !isNaN(Number(search));
      const IsValidDate = isNumber && Number(search) <= 2147483647;
      qb.andWhere(
        `(
          user.username  ILIKE :search
          OR user.mobile_no = :exactSearch
          OR loan.status    ILIKE :search
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

    if (!loans.length)
      throw new NotFoundException({
        message: 'No data found for the given filters.',
      });

    // ─── Fetch EMIs for matched loans ─────────────────────────────
    const loanIds = loans.map((l) => l.id);

    const emiQb = this.emiRepo
      .createQueryBuilder('emi')
      .where('emi.loanId IN (:...loanIds)', { loanIds })
      .orderBy('emi.emiNumber', 'ASC');

    // ─── Filter EMIs by dueDate range ─────────────────────────────
    if (startDate)
      emiQb.andWhere('emi.dueDate >= :startDate', {
        startDate: new Date(startDate),
      });
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      emiQb.andWhere('emi.dueDate <= :endDate', { endDate: end });
    }

    if (emiNumber !== undefined)
      emiQb.andWhere('emi.emiNumber = :emiNumber', { emiNumber });

    const allEmis = await emiQb.getMany();

    // ─── Group EMIs by loanId ─────────────────────────────────────
    const emiByLoan = this.groupEmisByLoan(allEmis);

    // ─── If any EMI filter active → only keep loans that have matching EMIs ──
    const hasEmiFilter = !!(startDate || endDate || emiNumber !== undefined);

    const filteredLoans = hasEmiFilter
      ? loans.filter((l) => emiByLoan.has(l.id))
      : loans;

    if (!filteredLoans.length)
      throw new NotFoundException({
        message: 'No data found for the given filters.',
      });

    // ─── Apply pagination AFTER EMI filter ────────────────────────
    const totalCount = filteredLoans.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedLoans =
      showAll === 'true'
        ? filteredLoans
        : filteredLoans.slice((page - 1) * limit, page * limit);

    // ─── Build user map grouped by userId ─────────────────────────
    const userMap = new Map<number, { userInfo: any; loans: any[] }>();

    for (const loan of paginatedLoans) {
      const emis = emiByLoan.get(loan.id) ?? [];
      const paidEmiCount = emis.filter(
        (e) => e.status === 'paid' || e.status === 'delayed',
      ).length;
      const totalPenalty = parseFloat(
        emis.reduce((sum, e) => sum + Number(e.penaltyAmount), 0).toFixed(2),
      );
      const remainingBalance = this.calcRemainingBalance(
        loan.totalPayable,
        loan.amountPaid,
      );

      const loanEntry = {
        loanId: loan.id,
        requestedAmount: `₹${loan.requestedAmount}`,
        approvedAmount: `₹${loan.approvedAmount}`,
        interestAmount: `₹${loan.interestAmount}`,
        totalPayable: `₹${loan.totalPayable}`,
        amountPaid: `₹${loan.amountPaid}`,
        remainingBalance: `₹${remainingBalance}`,
        emiCount: loan.emiCount,
        emiAmount: `₹${loan.emiAmount}`,
        paidEmiCount,
        remainingEmiCount: loan.emiCount - paidEmiCount,
        totalPenalty: `₹${totalPenalty}`,
        status: loan.status,
        totalLoansTaken: loan.totalLoansTaken,
        emiPayments: emis.map((e) => ({
          emiId: e.id,
          emiNumber: e.emiNumber,
          emiAmount: `₹${e.emiAmount}`,
          penaltyAmount: `₹${e.penaltyAmount}`,
          totalPaid: `₹${e.totalPaid}`,
          dueDate: this.formatDate(e.dueDate),
          paidDate: this.formatDate(e.paidDate),
          status: e.status,
        })),
      };

      const uid = loan.user.id;
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          userInfo: {
            userId: loan.user.id,
            username: loan.user.username,
            mobile_no: loan.user.mobile_no,
          },
          loans: [],
        });
      }
      userMap.get(uid)!.loans.push(loanEntry);
    }

    // ─── Build result with per-user summary ───────────────────────
    const users = Array.from(userMap.values()).map(({ userInfo, loans }) => ({
      ...userInfo,
      summary: {
        totalLoans: loans.length,
        totalBorrowed: `₹${this.sumField(loans, 'approvedAmount')}`,
        totalPaid: `₹${this.sumField(loans, 'amountPaid')}`,
        totalRemaining: `₹${this.sumField(loans, 'remainingBalance')}`,
        totalPenalty: `₹${this.sumField(loans, 'totalPenalty')}`,
      },
      loans,
    }));

    // ─── Pagination meta ──────────────────────────────────────────
    const pagination =
      showAll === 'true'
        ? { totalRecords: totalCount, totalPages: 1, showAll: true }
        : { totalRecords: totalCount, totalPages, currentPage: page, limit };

    const responseData = {
      message: 'User loan and EMI data fetched successfully.',
      data: { pagination, users },
    };

    if (download === 'csv') return this.downloadCsv(users, res);
    if (download === 'json') return this.downloadJson(responseData, res);

    return responseData;
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────
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

  private groupEmisByLoan(emis: EmiPayment[]): Map<number, EmiPayment[]> {
    const map = new Map<number, EmiPayment[]>();
    for (const emi of emis) {
      if (!map.has(emi.loanId)) map.set(emi.loanId, []);
      map.get(emi.loanId)!.push(emi);
    }
    return map;
  }

  private calcRemainingBalance(
    totalPayable: number,
    amountPaid: number,
  ): number {
    return Math.max(
      parseFloat((Number(totalPayable) - Number(amountPaid)).toFixed(2)),
      0,
    );
  }

  private sumField(loans: any[], field: string): number {
    return parseFloat(
      loans
        .reduce((s, l) => s + Number(String(l[field]).replace('₹', '')), 0)
        .toFixed(2),
    );
  }

  // ─── PRIVATE: CSV DOWNLOAD ────────────────────────────────────
  private downloadCsv(users: any[], res: Response): void {
    const headers = [
      'User ID',
      'Username',
      'Mobile No',
      'Loan ID',
      'Requested Amount',
      'Approved Amount',
      'Interest Amount',
      'Total Payable',
      'Amount Paid',
      'Remaining Balance',
      'EMI Count',
      'EMI Amount',
      'Paid EMIs',
      'Remaining EMIs',
      'Total Penalty',
      'Loan Status',
      'EMI Number',
      'EMI Amount Paid',
      'Penalty',
      'Total Paid',
      'Due Date',
      'Paid Date',
      'EMI Status',
    ];

    const rows: string[][] = [];

    for (const user of users) {
      for (const loan of user.loans) {
        const baseRow = [
          user.userId,
          user.username,
          user.mobile_no,
          loan.loanId,
          loan.requestedAmount,
          loan.approvedAmount,
          loan.interestAmount,
          loan.totalPayable,
          loan.amountPaid,
          loan.remainingBalance,
          loan.emiCount,
          loan.emiAmount,
          loan.paidEmiCount,
          loan.remainingEmiCount,
          loan.totalPenalty,
          loan.status,
        ].map(String);

        if (!loan.emiPayments.length) {
          rows.push([...baseRow, '', '', '', '', '', '', '']);
        } else {
          for (const emi of loan.emiPayments) {
            rows.push(
              [
                ...baseRow,
                emi.emiNumber,
                emi.emiAmount,
                emi.penaltyAmount,
                emi.totalPaid,
                emi.dueDate,
                emi.paidDate,
                emi.status,
              ].map(String),
            );
          }
        }
      }
    }

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
