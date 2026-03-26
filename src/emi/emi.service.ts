/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { EmiPayment } from '../emi/entities/emi-payment.entity';
import { Loan } from '../loan/entities/loan.entity';
import { PayEmiDto } from 'src/auth/dto/pay_emi.dto';
import { EmiHistoryQueryDto } from './dto/emi-history-query.dto';
import { randomBytes } from 'crypto';
import { PaymentLink } from './entities/payment-link.entity';

@Injectable()
export class EmiService {
  constructor(
    @InjectRepository(EmiPayment) private emiRepo: Repository<EmiPayment>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    @InjectRepository(PaymentLink)
    private paymentLinkRepo: Repository<PaymentLink>,
  ) {}

  // ─── PAY EMI ──────────────────────────────────────────────────
  async payEmi(dto: PayEmiDto) {
    const loan = await this.findLoanOrFail(dto.loanId);

    if (loan.status === 'completed')
      throw new ConflictException({ message: 'Loan already completed.' });

    if (loan.status === 'defaulted')
      throw new ForbiddenException({
        message: 'Loan defaulted. Not eligible.',
      });

    const loanCreatedAt = new Date(loan.createdAt);

    if (dto.isLoanDefaulted(loanCreatedAt, loan.emiCount)) {
      await this.markLoanDefaulted(loan);
      throw new ConflictException({ message: 'Loan duration ended.' });
    }

    const paidEmis = await this.emiRepo.find({
      where: { loanId: dto.loanId },
    });

    const paidCount = this.countPaidEmis(paidEmis);

    if (paidCount >= loan.emiCount)
      throw new ConflictException({
        message: 'All EMIs already paid.',
      });

    const totalPayable = Number(loan.totalPayable);

    const totalAmountPaidSoFar = paidEmis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );

    const remainingBalance = Math.max(
      parseFloat((totalPayable - totalAmountPaidSoFar).toFixed(2)),
      0,
    );

    const emiAmount = Number(loan.emiAmount);

    // 🔥 CORE FIX
    const maxPayable = Math.min(emiAmount, remainingBalance);

    if (dto.amount <= 0) {
      throw new BadRequestException({
        message: 'Enter valid amount',
      });
    }

    if (dto.amount > maxPayable) {
      throw new BadRequestException({
        message: `Amount ₹${dto.amount} exceeds allowed amount ₹${maxPayable}`,
      });
    }

    const emiNumber = paidCount + 1;

    const dueDate = dto.getEmiDueDate(loanCreatedAt, emiNumber);

    const isDelayed = dto.isDelayed(dueDate);

    const penaltyAmount = isDelayed ? dto.calculatePenalty(emiAmount) : 0;

    const totalPaid = dto.amount + penaltyAmount;

    const emiStatus = isDelayed ? 'delayed' : 'paid';

    const newTotalAmountPaid = totalAmountPaidSoFar + totalPaid;

    await this.emiRepo.save(
      this.emiRepo.create({
        loanId: dto.loanId,
        userId: loan.user.id,
        emiNumber,
        emiAmount: dto.amount,
        penaltyAmount,
        totalPaid,
        dueDate,
        paidDate: new Date(),
        status: emiStatus,
      }),
    );

    loan.amountPaid = newTotalAmountPaid;

    const isLoanCompleted = newTotalAmountPaid >= totalPayable;

    if (isLoanCompleted) {
      loan.status = 'completed';
      loan.user.hasAppliedLoan = false;
      await this.loanRepo.manager.save(loan.user);
    }

    await this.loanRepo.save(loan);

    const newRemainingBalance = Math.max(
      parseFloat((totalPayable - newTotalAmountPaid).toFixed(2)),
      0,
    );

    return {
      message: isLoanCompleted
        ? '🎉 Loan completed successfully'
        : `EMI ${emiNumber} paid successfully`,
      data: {
        loanId: dto.loanId,
        emiNumber,
        emiAmount: `₹${dto.amount}`,
        penaltyAmount: `₹${penaltyAmount}`,
        totalPaid: `₹${totalPaid}`,
        remainingBalance: `₹${newRemainingBalance}`,
        status: emiStatus,
        remainingEmis: isLoanCompleted ? 0 : loan.emiCount - emiNumber,
        loanStatus: isLoanCompleted ? 'completed' : 'active',
      },
    };
  }

  // ─── GET EMI STATUS ───────────────────────────────────────────
  async getEmiStatus(loanId: number) {
    const loan = await this.findLoanOrFail(loanId);

    const emis = await this.emiRepo.find({ where: { loanId } });
    const paidCount = this.countPaidEmis(emis);
    const loanCreatedAt = new Date(loan.createdAt);
    const today = new Date();

    const loanEndDate = new Date(loanCreatedAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + loan.emiCount);

    const nextDueDate = new Date(loanCreatedAt);
    nextDueDate.setMonth(nextDueDate.getMonth() + paidCount + 1);

    const daysLeft = Math.max(
      Math.ceil((loanEndDate.getTime() - today.getTime()) / 86400000),
      0,
    );
    const remainingEmis = loan.emiCount - paidCount;

    if (today > loanEndDate && loan.status !== 'completed')
      await this.markLoanDefaulted(loan);

    const totalAmountPaid = emis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );
    const remainingBalance = parseFloat(
      (Number(loan.totalPayable) - totalAmountPaid).toFixed(2),
    );

    return {
      message: 'EMI status fetched successfully.',
      data: {
        loanId,
        userId: loan.user.id,
        username: loan.user.username,
        mobile_no: loan.user.mobile_no,
        loanStatus: loan.status,
        totalEmis: loan.emiCount,
        paidEmis: paidCount,
        remainingEmis,
        emiAmount: `₹${loan.emiAmount}`,
        totalPayable: `₹${loan.totalPayable}`,
        totalAmountPaid: `₹${totalAmountPaid}`,
        remainingBalance: `₹${Math.max(remainingBalance, 0)}`,
        nextDueDate: remainingEmis > 0 ? this.formatDate(nextDueDate) : null,
        loanEndDate: this.formatDate(loanEndDate),
        daysLeft,
        loanTimeMessage:
          daysLeft <= 0
            ? 'Loan duration completed.'
            : `${daysLeft} days remaining.`,
      },
    };
  }

  // ─── GET EMI HISTORY (pagination + download) ──────────────────
  async getEmiHistory(query: EmiHistoryQueryDto, res: Response) {
    const { fromDate, toDate, emiNumber, showAll, download, search } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    // ─── Build EMI query ──────────────────────────────────────────
    const qb = this.emiRepo
      .createQueryBuilder('emi')
      .leftJoinAndSelect('emi.loan', 'loan')
      .leftJoinAndSelect('loan.user', 'user')
      .orderBy('emi.id', 'ASC')
      .addOrderBy('emi.emiNumber', 'ASC');

    // ─── Single search: userId, loanId, mobile_no ─────────────────
    if (search) {
      const isNumber = !isNaN(Number(search));
      const isValidId = isNumber && Number(search) <= 2147483647;
      qb.andWhere(
        `(
          user.mobile_no = :exactSearch
          OR user.username ILIKE :search
          ${isValidId ? 'OR emi.loanId = :numSearch' : ''}
          ${isValidId ? 'OR user.id    = :numSearch' : ''}
        )`,
        {
          search: `%${search}%`,
          exactSearch: search,
          ...(isValidId && { numSearch: Number(search) }),
        },
      );
    }

    // ─── Filter EMIs by dueDate range ─────────────────────────────
    if (fromDate)
      qb.andWhere('emi.dueDate >= :fromDate', { fromDate: new Date(fromDate) });
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('emi.dueDate <= :toDate', { toDate: end });
    }

    // ─── Filter by emiNumber ──────────────────────────────────────
    if (emiNumber !== undefined)
      qb.andWhere('emi.emiNumber = :emiNumber', { emiNumber });

    const totalCount = await qb.getCount();

    if (!totalCount)
      throw new NotFoundException({
        message: 'No EMI history found.',
      });

    // ─── Apply pagination AFTER all filters ───────────────────────
    const allEmis = await qb.getMany();
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedEmis =
      showAll === 'true'
        ? allEmis
        : allEmis.slice((page - 1) * limit, page * limit);

    const emiList = paginatedEmis.map((e) => ({
      emiId: e.id,
      loanId: e.loanId,
      userId: e.loan?.user?.id,
      username: e.loan?.user?.username,
      mobile_no: e.loan?.user?.mobile_no,
      emiNumber: e.emiNumber,
      totalEmiCount: e.loan?.emiCount,
      emiAmount: `₹${e.emiAmount}`,
      penaltyAmount: `₹${e.penaltyAmount}`,
      totalPaid: `₹${e.totalPaid}`,
      dueDate: this.formatDate(e.dueDate),
      paidDate: this.formatDate(e.paidDate),
      status: e.status,
    }));

    const pagination =
      showAll === 'true'
        ? { totalRecords: totalCount, totalPages: 1, showAll: true }
        : { totalRecords: totalCount, totalPages, currentPage: page, limit };

    const responseData = {
      message: 'EMI history fetched successfully.',
      data: {
        pagination,
        emis: emiList,
      },
    };

    if (download === 'csv') return this.downloadCsv(emiList, res);
    if (download === 'json') return this.downloadJson(responseData, res);

    return responseData;
  }

  async generatePaymentLink(loanId: number) {
    const loan = await this.findLoanOrFail(loanId);

    const paidEmis = await this.emiRepo.find({
      where: { loanId },
    });

    const paidCount = this.countPaidEmis(paidEmis);
    const emiNumber = paidCount + 1;

    if (emiNumber > loan.emiCount) {
      return {
        message: 'All EMIs already paid',
      };
    }

    const token = randomBytes(16).toString('hex');

    await this.paymentLinkRepo.save({
      loanId,
      emiNumber,
      token,
      isUsed: false,
    });

    return {
      // message: `Payment link generated for EMI ${emiNumber}`,
      emiNumber,
      url: `http://localhost:3000/pay.html?token=${token}`,
    };
  }

  async getEmiDetailsByToken(token: string) {
    const link = await this.paymentLinkRepo.findOne({ where: { token } });
    if (!link) throw new NotFoundException('Invalid link');

    const loan = await this.findLoanOrFail(link.loanId);

    const paidEmis = await this.emiRepo.find({
      where: { loanId: link.loanId },
    });

    const paidCount = this.countPaidEmis(paidEmis);

    const totalPaid = paidEmis.reduce((sum, e) => sum + Number(e.totalPaid), 0);

    const rawRemaining = Number(loan.totalPayable) - totalPaid;

    const remainingBalance = Math.max(parseFloat(rawRemaining.toFixed(2)), 0);

    const lastEmi = paidEmis[paidEmis.length - 1];

    const penaltyAmount = lastEmi ? Number(lastEmi.penaltyAmount) : 0;

    const loanCreatedAt = new Date(loan.createdAt);

    const dueDate = new Date(loanCreatedAt);
    dueDate.setMonth(dueDate.getMonth() + link.emiNumber);

    const loanEndDate = new Date(loanCreatedAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + loan.emiCount);

    const today = new Date();
    const isDelayed = today > dueDate;
    const daysLeft = Math.max(
      Math.ceil((dueDate.getTime() - today.getTime()) / 86400000),
      0,
    );

    const emiAmount = Number(loan.emiAmount);
    const maxPayable = Math.min(emiAmount, remainingBalance);

    return {
      loanId: loan.id,
      emiNumber: link.emiNumber,

      loanAmount: Number(loan.approvedAmount),
      interestAmount: Number(loan.interestAmount),
      totalPayable: Number(loan.totalPayable),

      emiAmount,
      maxPayable,
      totalPaid,
      remainingBalance,

      penaltyAmount,
      remainingEmis: Math.max(loan.emiCount - paidCount, 0),

      dueDate: this.formatDate(dueDate),
      loanEndDate: this.formatDate(loanEndDate),
      isDelayed,
      daysLeft,
    };
  }

  async payEmiInternal(loanId: number, amount: number) {
    const dto = new PayEmiDto();
    dto.loanId = loanId;
    dto.amount = amount;

    return this.payEmi(dto);
  }

  async payEmiByToken(token: string, amount: number) {
    const link = await this.paymentLinkRepo.findOne({ where: { token } });

    if (!link) throw new NotFoundException('Invalid link');

    if (link.isUsed) {
      return { message: 'Link already used ❌' };
    }

    const loan = await this.findLoanOrFail(link.loanId);

    const paidEmis = await this.emiRepo.find({
      where: { loanId: loan.id },
    });

    const totalPaid = paidEmis.reduce((sum, e) => sum + Number(e.totalPaid), 0);

    const rawRemaining = Number(loan.totalPayable) - totalPaid;

    const remainingBalance = Math.max(parseFloat(rawRemaining.toFixed(2)), 0);

    const emiAmount = Number(loan.emiAmount);

    const maxPayable = Math.min(emiAmount, remainingBalance);

    if (amount <= 0) {
      return { message: 'Enter valid amount' };
    }

    if (amount > maxPayable) {
      return {
        message: `Amount ₹${amount} exceeds allowed amount ₹${maxPayable}`,
      };
    }

    const result = await this.payEmiInternal(loan.id, amount);

    if (amount === remainingBalance) {
      link.isUsed = true;
      await this.paymentLinkRepo.save(link);
    }

    return result;
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

  private async findLoanOrFail(loanId: number) {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['user'],
    });
    if (!loan)
      throw new NotFoundException({
        message: 'Loan not found.',
      });
    return loan;
  }

  private countPaidEmis(emis: EmiPayment[]): number {
    return emis.filter((e) => e.status === 'paid' || e.status === 'delayed')
      .length;
  }

  private async markLoanDefaulted(loan: any): Promise<void> {
    loan.status = 'defaulted';
    loan.user.hasAppliedLoan = false;
    await this.loanRepo.manager.save(loan.user);
    await this.loanRepo.save(loan);
  }

  // ─── PRIVATE: CSV DOWNLOAD ────────────────────────────────────
  private downloadCsv(emis: any[], res: Response): void {
    const headers = [
      'EMI ID',
      'Loan ID',
      'User ID',
      'Username',
      'Mobile No',
      'EMI Number',
      'Total EMI Count',
      'EMI Amount',
      'Penalty Amount',
      'Total Paid',
      'Due Date',
      'Paid Date',
      'Status',
    ];

    const rows = emis.map((e) =>
      [
        e.emiId,
        e.loanId,
        e.userId,
        e.username,
        e.mobile_no,
        e.emiNumber,
        e.totalEmiCount,
        e.emiAmount,
        e.penaltyAmount,
        e.totalPaid,
        e.dueDate,
        e.paidDate,
        e.status,
      ].map(String),
    );

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const filename = `emi-history-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── PRIVATE: JSON DOWNLOAD ───────────────────────────────────
  private downloadJson(data: any, res: Response): void {
    const filename = `emi-history-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }
}
