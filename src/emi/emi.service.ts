import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmiPayment } from '../emi/entities/emi-payment.entity';
import { Loan } from '../loan/entities/loan.entity';

@Injectable()
export class EmiService {
  constructor(
    @InjectRepository(EmiPayment)
    private emiRepo: Repository<EmiPayment>,

    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,
  ) {}

  async payEmi(loanId: number, amount: number): Promise<any> {
    const loan = await this.loanRepo.findOne({
      where: { id: Number(loanId) },
      relations: ['user'],
    });

    if (!loan) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Loan not found.',
      });
    }

    if (loan.status === 'completed') {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Loan already completed.',
      });
    }

    if (loan.status === 'defaulted')
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Loan Default.You are not eligible for loan.',
      });

    if (!amount || amount <= 0) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Invalid amount.',
      });
    }
    //`Minimum EMI amount is ₹${loan.emiAmount}`
    if (amount < Number(loan.emiAmount)) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: `Minimum EMI amount is ₹${loan.emiAmount}`,
      });
    }
    const loanCreatedAt = new Date(loan.createdAt);
    const loanEndDate = new Date(loanCreatedAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + loan.emiCount);
    const today = new Date();

    if (today > loanEndDate && loan.status !== 'completed') {
      loan.status = 'defaulted';
      await this.loanRepo.save(loan);
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Loan ended date passed.',
      });
    }
    const paidEmis = await this.emiRepo.find({
      where: { loanId: Number(loanId) },
    });

    const paidCount = paidEmis.filter(
      (e) => e.status === 'paid' || e.status === 'delayed',
    ).length;

    if (paidCount >= loan.emiCount) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'All Emi already paid',
      });
    }

    const emiNumber = paidCount + 1;

    const dueDate = new Date(loanCreatedAt);
    dueDate.setMonth(dueDate.getMonth() + emiNumber);

    const isDelayed = today > dueDate;
    const penaltyAmount = isDelayed
      ? parseFloat((Number(loan.emiAmount) * 0.02).toFixed(2))
      : 0;

    const totalPaid = parseFloat((Number(amount) + penaltyAmount).toFixed(2));

    const emiStatus = isDelayed ? 'delayed' : 'paid';

    const totalAmountPaidSoFar = paidEmis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );
    const newTotalAmountPaid = parseFloat(
      (totalAmountPaidSoFar + totalPaid).toFixed(2),
    );
    const totalPayable = Number(loan.totalPayable);
    const isOverPaid = newTotalAmountPaid > totalPayable;
    const ExcessAmount = isOverPaid
      ? parseFloat((newTotalAmountPaid - totalPayable).toFixed(2))
      : 0;

    const emi = this.emiRepo.create({
      loanId: Number(loanId),
      userId: loan.user.id,
      emiNumber,
      emiAmount: amount,
      penaltyAmount,
      totalPaid,
      dueDate,
      paidDate: today,
      status: emiStatus,
    });

    await this.emiRepo.save(emi);

    loan.amountPaid = newTotalAmountPaid;

    const isLoanCompleted =
      emiNumber === loan.emiCount || newTotalAmountPaid >= totalPayable;
    if (isLoanCompleted) loan.status = 'completed';

    await this.loanRepo.save(loan);

    const remainingEmis = isLoanCompleted ? 0 : loan.emiCount - emiNumber;

    return {
      success: true,
      statusCode: 200,
      message: isLoanCompleted
        ? 'Loan completed successfully. You are now eligible to apply for a new loan.'
        : `EMI ${emiNumber} paid successfully.`,
      data: {
        loanId: Number(loanId),
        emiNumber,
        emiAmount: amount,
        penaltyAmount,
        totalPaid,
        totalAmountPaidSoFar: newTotalAmountPaid,
        remainingBalance: isOverPaid
          ? 0
          : parseFloat((totalPayable - newTotalAmountPaid).toFixed(2)),
        ...(isOverPaid && {
          excessAmount: ExcessAmount,
          excessMessage: `₹${ExcessAmount} paid extra. It will be adjusted or refunded.`,
        }),
        dueDate,
        paidDate: today,
        status: emiStatus,
        remainingEmis,
        loanStatus: isLoanCompleted ? 'completed' : 'active',
      },
    };
  }

  async getEmiStatus(loanId: number): Promise<any> {
    const loan = await this.loanRepo.findOne({
      where: { id: Number(loanId) },
    });

    if (!loan) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Loan not found.',
      });
    }

    const emis = await this.emiRepo.find({
      where: { loanId: parseInt(String(loanId)) },
    });

    const paidCount = emis.filter(
      (e) => e.status === 'paid' || e.status === 'delayed',
    ).length;

    const remainingEmis = loan.emiCount - paidCount;

    const loanCreatedAt = new Date(loan.createdAt);
    const nextDueDate = new Date(loanCreatedAt);
    nextDueDate.setMonth(nextDueDate.getMonth() + paidCount + 1);

    const loanEndDate = new Date(loanCreatedAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + loan.emiCount);

    const today = new Date();
    const timeLeft = Math.ceil(
      (loanEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (today > loanEndDate && loan.status !== 'completed') {
      loan.status = 'defaulted';
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
        remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
        nextDueDate: remainingEmis > 0 ? nextDueDate : null,
        loanEndDate,
        daysLeft: timeLeft > 0 ? timeLeft : 0,
        loanTimeMessage:
          timeLeft <= 0
            ? 'Loan duration completed.'
            : `${timeLeft} days remaining.`,
      },
    };
  }

  async getEmiHistory(loanId: number): Promise<any> {
    const emis = await this.emiRepo.find({
      where: { loanId: parseInt(String(loanId)) },
      order: { emiNumber: 'ASC' }, // 👈 ordered by emiNumber
    });

    if (!emis || emis.length === 0) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'NO EMI history found.',
      });
    }

    const totalAmountPaid = emis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );
    return {
      success: true,
      statusCode: 200,
      message: 'EMI history fetched successfully.',
      data: {
        loanId,
        totalEmis: emis.length,
        totalAmountPaid,
        emis,
      },
    };
  }
}
