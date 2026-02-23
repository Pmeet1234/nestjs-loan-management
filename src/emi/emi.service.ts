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

    if (!loan) throw new BadRequestException('Loan not found');

    if (loan.status === 'completed')
      throw new BadRequestException('Loan already completed');

    if (loan.status === 'defaulted')
      throw new BadRequestException(
        'Loan defaulted. You are not eligible to pay EMI.',
      );

    if (!amount || amount <= 0) throw new BadRequestException('Invalid amount');

    if (amount < Number(loan.emiAmount))
      throw new BadRequestException(`Minimum EMI amount is ₹${loan.emiAmount}`);

    const loanCreatedAt = new Date(loan.createdAt);
    const loanEndDate = new Date(loanCreatedAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + loan.emiCount);

    const today = new Date();

    if (today > loanEndDate && loan.status !== 'completed') {
      loan.status = 'defaulted';
      await this.loanRepo.save(loan);
      throw new BadRequestException(
        'Loan end date passed. Loan is now defaulted.',
      );
    }
    const paidEmis = await this.emiRepo.find({
      where: { loanId: Number(loanId) },
    });

    const paidCount = paidEmis.filter(
      (e) => e.status === 'paid' || e.status === 'delayed',
    ).length;

    if (paidCount >= loan.emiCount)
      throw new BadRequestException('All EMIs already paid');

    const emiNumber = paidCount + 1;

    const dueDate = new Date(loanCreatedAt);
    dueDate.setMonth(dueDate.getMonth() + emiNumber);

    const isDelayed = today > dueDate;
    const penaltyAmount = isDelayed
      ? parseFloat((Number(loan.emiAmount) * 0.02).toFixed(2))
      : 0;

    const totalPaid = parseFloat(
      (Number(loan.emiAmount) + penaltyAmount).toFixed(2),
    );

    const emiStatus = isDelayed ? 'delayed' : 'paid';

    const totalAmountPaidSoFar = paidEmis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );
    const newTotalAmountPaid = parseFloat(
      (totalAmountPaidSoFar + totalPaid).toFixed(2),
    );
    const remainingBalance = parseFloat(
      (Number(loan.totalPayable) - newTotalAmountPaid).toFixed(2),
    );

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
    if (emiNumber === loan.emiCount) {
      loan.status = 'completed';
    }
    await this.loanRepo.save(loan);

    const remainingEmis = loan.emiCount - emiNumber;

    return {
      message: `EMI ${emiNumber} paid successfully`,
      emiNumber,
      emiAmount: amount,
      penaltyAmount,
      totalPaid,
      totalAmountPaidSoFar: newTotalAmountPaid,
      remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
      dueDate,
      paidDate: today,
      status: emiStatus,
      remainingEmis,
      loanStatus: emiNumber === loan.emiCount ? 'completed' : 'active',
    };
  }

  async getEmiStatus(loanId: number): Promise<any> {
    const loan = await this.loanRepo.findOne({
      where: { id: Number(loanId) },
    });

    if (!loan) throw new BadRequestException('Loan not found');

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
      message: timeLeft <= 0 ? 'Loan time finished' : `${timeLeft} days left`,
    };
  }

  async getEmiHistory(loanId: number): Promise<any> {
    const emis = await this.emiRepo.find({
      where: { loanId: parseInt(String(loanId)) },
      order: { emiNumber: 'ASC' }, // 👈 ordered by emiNumber
    });

    if (!emis || emis.length === 0)
      throw new BadRequestException('No EMI history found');

    const totalAmountPaid = emis.reduce(
      (sum, e) => sum + Number(e.totalPaid),
      0,
    );
    return {
      message: 'EMI history fetched successfully',
      loanId,
      totalEmis: emis.length,
      totalAmountPaid,
      emis,
    };
  }
}
