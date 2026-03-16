/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Loan } from '../loan/entities/loan.entity';
import { EmiPayment } from '../emi/entities/emi-payment.entity';
import { UserLoanEmiReportDto } from './dto/user-loan-emi-report.dto';
import { Response } from 'express';
@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    @InjectRepository(EmiPayment) private emiRepo: Repository<EmiPayment>,
  ) {}

  async getAllUserLoanAndEmiData(filters: UserLoanEmiReportDto, res: Response) {
    const {
      startDate,
      endDate,
      username,
      mobile_no,
      userId,
      loanId,
      status,
      emiNumber,
      page = 1,
      limit = 10,
      showAll,
    } = filters;

    // ── Build loan query
    const loanQuery = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user');

    if (startDate)
      loanQuery.andWhere('loan.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      loanQuery.andWhere('loan.createdAt <= :endDate', { endDate: end });
    }
    if (status) loanQuery.andWhere('loan.status = :status', { status });
    if (loanId) loanQuery.andWhere('loan.id = :loanId', { loanId });
    if (userId) loanQuery.andWhere('user.id = :userId', { userId });
    if (username)
      loanQuery.andWhere('user.username ILIKE :username', {
        username: `%${username}%`,
      });
    if (mobile_no)
      loanQuery.andWhere('user.mobile_no = :mobile_no', { mobile_no });

    // Get total count before pagination
    const totalCount = await loanQuery.getCount();

    // Apply pagination or return all
    loanQuery.orderBy('loan.createdAt', 'DESC').addOrderBy('loan.id', 'ASC');
    if (showAll !== 'true') loanQuery.skip((page - 1) * limit).take(limit);

    const loans = await loanQuery.getMany();

    if (!loans.length)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'No data found for the given filters.',
      });

    // ── Fetch EMIs for matched loans
    const loanIds = loans.map((l) => l.id);

    let emiQuery = this.emiRepo
      .createQueryBuilder('emi')
      .where('emi.loanId IN (:...loanIds)', { loanIds })
      .orderBy('emi.emiNumber', 'ASC');

    if (emiNumber !== undefined)
      emiQuery = emiQuery.andWhere('emi.emiNumber = :emiNumber', { emiNumber });

    const allEmis = await emiQuery.getMany();

    // ── Group EMIs by loanId
    const emiByLoan = new Map<number, EmiPayment[]>();
    for (const emi of allEmis) {
      if (!emiByLoan.has(emi.loanId)) emiByLoan.set(emi.loanId, []);
      emiByLoan.get(emi.loanId)!.push(emi);
    }

    // If emiNumber filter active → keep only loans that have that EMI
    let filteredLoans = loans;
    if (emiNumber !== undefined) {
      filteredLoans = loans.filter((l) => emiByLoan.has(l.id));
      if (!filteredLoans.length)
        throw new NotFoundException({
          success: false,
          statusCode: 404,
          message: `No loans found with EMI number ${emiNumber}.`,
        });
    }

    // ── Build user map grouped by userId
    const userMap = new Map<number, { userInfo: any; loans: any[] }>();

    for (const loan of filteredLoans) {
      const emis = emiByLoan.get(loan.id) || [];
      const paidEmiCount = emis.filter(
        (e) => e.status === 'paid' || e.status === 'delayed',
      ).length;
      const totalPenalty = emis.reduce(
        (sum, e) => sum + Number(e.penaltyAmount),
        0,
      );
      const remainingBalance = Math.max(
        parseFloat(
          (Number(loan.totalPayable) - Number(loan.amountPaid)).toFixed(2),
        ),
        0,
      );

      const loanEntry = {
        loanId: loan.id,
        requestedAmount: loan.requestedAmount,
        approvedAmount: loan.approvedAmount,
        interestAmount: loan.interestAmount,
        totalPayable: loan.totalPayable,
        amountPaid: loan.amountPaid,
        remainingBalance,
        emiCount: loan.emiCount,
        emiAmount: loan.emiAmount,
        paidEmiCount,
        remainingEmiCount: loan.emiCount - paidEmiCount,
        totalPenalty: parseFloat(totalPenalty.toFixed(2)),
        status: loan.status,
        totalLoansTaken: loan.totalLoansTaken,
        emiPayments: emis.map((e) => ({
          emiId: e.id,
          emiNumber: e.emiNumber,
          emiAmount: e.emiAmount,
          penaltyAmount: e.penaltyAmount,
          totalPaid: e.totalPaid,
          dueDate: e.dueDate,
          paidDate: e.paidDate,
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
            isVerified: loan.user.isVerified,
            isEmploymentApproved: loan.user.isEmploymentApproved,
            hasAppliedLoan: loan.user.hasAppliedLoan,
            userCreatedAt: loan.user.createdAt,
          },
          loans: [],
        });
      }
      userMap.get(uid)!.loans.push(loanEntry);
    }

    // ── Build result with per-user summary
    const users = Array.from(userMap.values()).map(({ userInfo, loans }) => ({
      ...userInfo,
      summary: {
        totalLoans: loans.length,
        totalBorrowed: parseFloat(
          loans.reduce((s, l) => s + Number(l.approvedAmount), 0).toFixed(2),
        ),
        totalPaid: parseFloat(
          loans.reduce((s, l) => s + Number(l.amountPaid), 0).toFixed(2),
        ),
        totalRemaining: parseFloat(
          loans.reduce((s, l) => s + Number(l.remainingBalance), 0).toFixed(2),
        ),
        totalPenalty: parseFloat(
          loans.reduce((s, l) => s + Number(l.totalPenalty), 0).toFixed(2),
        ),
      },
      loans,
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const pagination =
      showAll === 'true'
        ? { totalRecords: totalCount, totalPages: 1, showAll: true }
        : {
            totalRecords: totalCount,
            totalPages,
            currentPage: page,
            limit,
            // hasNextPage: page < totalPages,
            // hasPrevPage: page > 1,
            // showAll: false,
          };

    const responseData = {
      success: true,
      statusCode: 200,
      message: 'User loan and EMI data fetched successfully.',
      data: { pagination, users },
    };

    if (filters.download === 'csv') return this.downloadCsv(users, res);
    if (filters.download === 'json')
      return this.downloadJson(responseData, res);

    return responseData;
  }
  // ─── builds and sends CSV file
  private downloadCsv(users: any[], res: Response): void {
    // these are the column names in the CSV file
    const headers = [
      'User ID',
      'Username',
      'Mobile No',
      'Employment Approved',
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

    // loop every user → every loan → every EMI payment
    // each EMI becomes ONE row in the CSV
    for (const user of users) {
      for (const loan of user.loans) {
        if (loan.emiPayments.length === 0) {
          // loan has no EMI payments yet → still add one row
          rows.push(
            [
              user.userId,
              user.username,
              user.mobile_no,
              user.isEmploymentApproved,
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
              '',
              '',
              '',
              '',
              '',
              '',
              '', // empty EMI columns
            ].map(String),
          );
        } else {
          // loan has EMI payments → one row per EMI
          for (const emi of loan.emiPayments) {
            rows.push(
              [
                user.userId,
                user.username,
                user.mobile_no,
                user.isEmploymentApproved,
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
                emi.emiNumber,
                emi.emiAmount,
                emi.penaltyAmount,
                emi.totalPaid,
                new Date(emi.dueDate).toISOString().split('T')[0], // format date
                emi.paidDate
                  ? new Date(emi.paidDate).toISOString().split('T')[0]
                  : '',
                emi.status,
              ].map(String),
            );
          }
        }
      }
    }

    // join all rows into one big CSV string
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // set filename with today's date  e.g. loan-report-2024-01-15.csv
    const filename = `loan-report-${new Date().toISOString().split('T')[0]}.csv`;

    // tell browser this is a downloadable CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── sends JSON file as download
  private downloadJson(data: any, res: Response): void {
    const filename = `loan-report-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2)); // null, 2 = pretty printed with indent
  }
}
