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

@Injectable()
export class EmiService {
  constructor(
    @InjectRepository(EmiPayment) private emiRepo: Repository<EmiPayment>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
  ) {}

  // ─── PAY EMI
  async payEmi(dto: PayEmiDto) {
    const loan = await this.loanRepo.findOne({
      where: { id: dto.loanId },
      relations: ['user'],
    });

    if (!loan)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'Loan not found.',
      });
    if (loan.status === 'completed')
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Loan already completed.',
      });
    if (loan.status === 'defaulted')
      throw new ForbiddenException({
        success: false,
        statusCode: 403,
        message: 'Loan defaulted. Not eligible.',
      });
    if (dto.amount < Number(loan.emiAmount))
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: `Minimum EMI amount is ₹${loan.emiAmount}`,
      });

    const loanCreatedAt = new Date(loan.createdAt);

    if (dto.isLoanDefaulted(loanCreatedAt, loan.emiCount)) {
      loan.status = 'defaulted';
      loan.user.hasAppliedLoan = false;
      await this.loanRepo.manager.save(loan.user);
      await this.loanRepo.save(loan);
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Loan duration ended.',
      });
    }

    const paidEmis = await this.emiRepo.find({ where: { loanId: dto.loanId } });
    const paidCount = paidEmis.filter(
      (e) => e.status === 'paid' || e.status === 'delayed',
    ).length;

    if (paidCount >= loan.emiCount)
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'All EMIs already paid.',
      });

    const emiNumber = paidCount + 1;
    const dueDate = dto.getEmiDueDate(loanCreatedAt, emiNumber);
    const isDelayed = dto.isDelayed(dueDate);
    const penaltyAmount = isDelayed
      ? dto.calculatePenalty(Number(loan.emiAmount))
      : 0;
    const totalPaid = dto.calculateTotalPaid(penaltyAmount);
    const totalPayable = Number(loan.totalPayable);
    const totalAmountPaidSoFar = paidEmis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );
    const remainingBalance = parseFloat(
      (totalPayable - totalAmountPaidSoFar).toFixed(2),
    );

    if (dto.isOverPayment(totalPaid, remainingBalance))
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: `Payment ₹${totalPaid} exceeds remaining balance ₹${remainingBalance}.`,
      });

    const newTotalAmountPaid = dto.calculateNewTotalPaid(
      totalAmountPaidSoFar,
      totalPaid,
    );
    const emiStatus = isDelayed ? 'delayed' : 'paid';

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
    const isLoanCompleted = dto.isLoanCompleted(
      emiNumber,
      loan.emiCount,
      newTotalAmountPaid,
      totalPayable,
    );

    if (isLoanCompleted) {
      loan.status = 'completed';
      loan.user.hasAppliedLoan = false;
      await this.loanRepo.manager.save(loan.user);
    }
    await this.loanRepo.save(loan);

    const newRemainingBalance = parseFloat(
      (totalPayable - newTotalAmountPaid).toFixed(2),
    );

    return {
      success: true,
      statusCode: 200,
      message: isLoanCompleted
        ? 'Loan completed. You can now apply for a new loan.'
        : `EMI ${emiNumber} paid successfully.`,
      data: {
        loanId: dto.loanId,
        emiNumber,
        emiAmount: dto.amount,
        penaltyAmount,
        totalPaid,
        totalAmountPaidSoFar: newTotalAmountPaid,
        remainingBalance: Math.max(newRemainingBalance, 0),
        dueDate,
        paidDate: new Date(),
        status: emiStatus,
        remainingEmis: isLoanCompleted ? 0 : loan.emiCount - emiNumber,
        loanStatus: isLoanCompleted ? 'completed' : 'active',
      },
    };
  }

  // ─── GET EMI STATUS
  async getEmiStatus(loanId: number) {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['user'],
    });

    if (!loan)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'Loan not found.',
      });

    const emis = await this.emiRepo.find({ where: { loanId } });
    const paidCount = emis.filter(
      (e) => e.status === 'paid' || e.status === 'delayed',
    ).length;
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

    if (today > loanEndDate && loan.status !== 'completed') {
      loan.status = 'defaulted';
      loan.user.hasAppliedLoan = false;
      await this.loanRepo.manager.save(loan.user);
      await this.loanRepo.save(loan);
    }

    const totalAmountPaid = emis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );
    const remainingBalance = parseFloat(
      (Number(loan.totalPayable) - totalAmountPaid).toFixed(2),
    );

    return {
      success: true,
      statusCode: 200,
      message: 'EMI status fetched successfully.',
      data: {
        loanId,
        loanStatus: loan.status,
        totalEmis: loan.emiCount,
        paidEmis: paidCount,
        remainingEmis,
        emiAmount: loan.emiAmount,
        totalPayable: loan.totalPayable,
        totalAmountPaid,
        remainingBalance: Math.max(remainingBalance, 0),
        nextDueDate: remainingEmis > 0 ? nextDueDate : null,
        loanEndDate,
        daysLeft,
        loanTimeMessage:
          daysLeft <= 0
            ? 'Loan duration completed.'
            : `${daysLeft} days remaining.`,
      },
    };
  }

  // ─── GET EMI HISTORY (pagination + download)
  async getEmiHistory(query: EmiHistoryQueryDto, res: Response) {
    const { loanId, page, limit, showAll, download } = query;

    const qb = this.emiRepo
      .createQueryBuilder('emi')
      .where('emi.loanId = :loanId', { loanId })
      .orderBy('emi.emiNumber', 'ASC');

    const totalCount = await qb.getCount();

    if (!totalCount)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'No EMI history found.',
      });

    if (showAll !== 'true') qb.skip((page - 1) * limit).take(limit);

    const emis = await qb.getMany();

    const totalAmountPaid = emis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );
    const totalPages = Math.ceil(totalCount / limit);

    const pagination =
      showAll === 'true'
        ? { totalRecords: totalCount, totalPages: 1, showAll: true }
        : { totalRecords: totalCount, totalPages, currentPage: page, limit };

    const responseData = {
      success: true,
      statusCode: 200,
      message: 'EMI history fetched successfully.',
      data: { loanId, pagination, totalAmountPaid, emis },
    };

    if (download === 'csv') return this.downloadCsv(loanId, emis, res);
    if (download === 'json') return this.downloadJson(responseData, res);

    return responseData;
  }

  // ─── PRIVATE: CSV DOWNLOAD
  private downloadCsv(loanId: number, emis: EmiPayment[], res: Response): void {
    const headers = [
      'EMI ID',
      'Loan ID',
      'EMI Number',
      'EMI Amount',
      'Penalty Amount',
      'Total Paid',
      'Due Date',
      'Paid Date',
      'Status',
    ];

    const rows = emis.map((e) =>
      [
        e.id,
        loanId,
        e.emiNumber,
        e.emiAmount,
        e.penaltyAmount,
        e.totalPaid,
        new Date(e.dueDate).toISOString().split('T')[0],
        e.paidDate ? new Date(e.paidDate).toISOString().split('T')[0] : '',
        e.status,
      ].map(String),
    );

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const filename = `emi-history-loan-${loanId}-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── PRIVATE: JSON DOWNLOAD
  private downloadJson(data: any, res: Response): void {
    const filename = `emi-history-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }
}
