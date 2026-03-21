// import { isNumber } from 'class-validator';
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { Response } from 'express';
import { EmiPayment } from 'src/emi/entities/emi-payment.entity';
import { User } from 'src/user/entities/user.entity';
import { Loan } from 'src/loan/entities/loan.entity';
import { UserLoanEmiReportDto } from './dto/user-loan-emi-report.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    @InjectRepository(EmiPayment) private emiRepo: Repository<EmiPayment>,
  ) {}

  async getAllUserLoanAndEmiData(filters: UserLoanEmiReportDto) {
    const { search, startDate, endDate, emiNumber, showAll } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;

    console.log('filters', filters);

    const qb = this.loanRepo
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .leftJoinAndSelect('loan.emiPayments', 'emi');

    if (search) {
      console.log('🔍 Search filter applied:', search);
      const isNumber = !isNaN(Number(search));
      console.log('🔍 Is search a number?', isNumber);
      qb.andWhere(
        `(
      user.username ILIKE :search
      or user.mobile_no = :exact
      or loan.status ILIKE :search
      ${isNumber ? 'or loan.id = :numSearch' : ''}
      ${isNumber ? 'or user.id = :numSearch' : ''})`,
        {
          search: `%${search}%`,
          exact: search,
          ...(isNumber && { numSearch: Number(search) }),
        },
      );
    }
    if (startDate) {
      console.log('📅 StartDate filter:', startDate);
      qb.andWhere('emi.dueDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      console.log('📅 EndDate filter:', end);
      qb.andWhere('emi.dueDate <= :endDate', {
        endDate: end,
      });
    }
    if (emiNumber !== undefined) {
      console.log('🔢 EmiNumber filter:', emiNumber);
      qb.andWhere('emi.emiNumber = :emiNumber', {
        emiNumber,
      });
    }
    qb.orderBy('loan.id', 'ASC').addOrderBy('emi.emiNumber', 'ASC');
    console.log('sql', qb.getSql()); //debug
    console.log('🔑 Params:', qb.getParameters());

    const loans = await qb.getMany(); //execute query-->get row loans array

    console.log('📦 Total loans fetched:', loans.length);
    console.log('📦 Loans data:', JSON.stringify(loans, null, 2));

    if (!loans.length) {
      throw new NotFoundException({
        message: 'No loan history found.',
      });
    }
    const userMap = new Map<number, any>(); //create empty map(ket,value) and group loan by user
    console.log('🗺️  Building userMap...');

    for (const loan of loans) {
      //Loops through every loan fetched from DB one by one.
      const userId = loan.user.id;
      console.log(`  → Processing loan.id=${loan.id}, userId=${userId}`);
      const loanData = {
        loanId: loan.id,
        requestedAmount: loan.requestedAmount,
        approvedAmount: loan.approvedAmount,
        totalPayable: loan.totalPayable,
        status: loan.status,
        emiPayments: loan.emiPayments.map((e) => ({
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
      console.log(
        `  → EMI count for loan ${loan.id}:`,
        loan.emiPayments.length,
      );

      //   If **NO** → create a new entry for this user with an empty `loans[]` array
      // - If **YES** → skip, user entry already exists
      //     ── Iteration 1: loan.id=1, userId=51 ──
      // userMap.has(51) → false
      // userMap.set(51, { userId:51, username:'John', loans:[] })

      // userMap.get(51).loans.push(loan1)
      // userMap = {
      //   51 → { username:'John', loans:[loan1] }
      // }
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: loan.user.id,
          username: loan.user.username,
          mobile_no: loan.user.mobile_no,
          loans: [],
        });
      }
      console.log(`  → User ${userId} already exists, pushing loan`);
      userMap.get(userId).loans.push(loanData);
    }
    console.log('🗺️  UserMap size:', userMap.size); // total unique users
    console.log('🗺️  UserMap keys:', [...userMap.values()]);
    const allUsers = [...userMap.values()]; //converts the Map values into a plain array
    const totalRecords = allUsers.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedUsers =
      showAll === 'true'
        ? allUsers
        : allUsers.slice((page - 1) * limit, page * limit);
    const pagination =
      showAll === 'true'
        ? {
            totalRecords,
            showAll: true, // flag so frontend knows
          }
        : {
            totalRecords,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage: page < totalPages, // useful for frontend
            hasPrevPage: page > 1, // useful for frontend
          };
    return {
      message: 'Loan history found.',
      data: {
        pagination,
        users: paginatedUsers,
      },
    };
  }
}
