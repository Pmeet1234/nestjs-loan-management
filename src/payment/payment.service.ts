/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { EmiPayment } from '../emi/entities/emi-payment.entity';
import { Loan } from '../loan/entities/loan.entity';
import { EmiService } from '../emi/emi.service';
import { PaymentLink } from './entites/payment-link.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentLink)
    private paymentLinkRepo: Repository<PaymentLink>,

    @InjectRepository(EmiPayment)
    private emiRepo: Repository<EmiPayment>,

    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,

    private emiService: EmiService, // 🔥 reuse EMI logic
  ) {}

  async generatePaymentLink(loanId: number) {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    const paidEmis = await this.emiRepo.find({
      where: { loanId },
    });

    const paidCount = paidEmis.length;
    const emiNumber = paidCount + 1;

    if (emiNumber > loan.emiCount) {
      throw new ConflictException('All EMIs already paid');
    }

    const token = randomBytes(16).toString('hex');

    await this.paymentLinkRepo.save({
      loanId,
      emiNumber,
      token,
      isUsed: false,
    });

    return {
      emiNumber,
      url: `http://localhost:3000/pay.html?token=${token}`,
    };
  }

  async getEmiDetailsByToken(token: string) {
    const link = await this.paymentLinkRepo.findOne({ where: { token } });

    if (!link) throw new NotFoundException('Invalid or expired link');

    const loan = await this.loanRepo.findOne({
      where: { id: link.loanId },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    const paidEmis = await this.emiRepo.find({
      where: { loanId: loan.id },
    });

    const totalPaid = paidEmis.reduce((sum, e) => sum + Number(e.totalPaid), 0);

    const totalPayable = Number(loan.totalPayable);

    const remainingBalance = Math.max(
      parseFloat((totalPayable - totalPaid).toFixed(2)),
      0,
    );

    const loanCreatedAt = new Date(loan.createdAt);

    const dueDate = new Date(loanCreatedAt);
    dueDate.setMonth(dueDate.getMonth() + link.emiNumber);

    const loanEndDate = new Date(loanCreatedAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + loan.emiCount);

    const today = new Date();

    const isDelayed = today > dueDate;

    const penaltyAmount = isDelayed
      ? Math.round(Number(loan.emiAmount) * 0.1)
      : 0;

    const daysLeft = Math.max(
      Math.ceil((dueDate.getTime() - today.getTime()) / 86400000),
      0,
    );

    return {
      loanId: loan.id,
      emiNumber: link.emiNumber,

      loanAmount: Number(loan.approvedAmount),
      interestAmount: Number(loan.interestAmount),
      totalPayable,

      emiAmount: Number(loan.emiAmount),
      maxPayable: remainingBalance, // ✅ FIXED

      totalPaid,
      remainingBalance,

      penaltyAmount: penaltyAmount || 0,
      remainingEmis: Math.max(loan.emiCount - paidEmis.length, 0),

      dueDate: dueDate ? this.formatDate(dueDate) : null,
      loanEndDate: loanEndDate ? this.formatDate(loanEndDate) : null,
      daysLeft,
      isDelayed,
    };
  }

  async payEmiByToken(token: string, amount: number) {
    const link = await this.paymentLinkRepo.findOne({ where: { token } });

    if (!link) throw new NotFoundException('Invalid or expired link');

    if (link.isUsed) {
      return { message: 'Payment link already used' };
    }

    if (amount <= 0) {
      throw new BadRequestException('Enter valid amount');
    }

    const loan = await this.loanRepo.findOne({
      where: { id: link.loanId },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    const paidEmis = await this.emiRepo.find({
      where: { loanId: loan.id },
    });

    const totalPaid = paidEmis.reduce((sum, e) => sum + Number(e.totalPaid), 0);

    const totalPayable = Number(loan.totalPayable);

    const remainingBalance = Math.max(
      parseFloat((totalPayable - totalPaid).toFixed(2)),
      0,
    );

    // ✅ FIX: allow bulk payment
    if (amount > remainingBalance) {
      throw new BadRequestException(
        `Amount ₹${amount} exceeds remaining ₹${remainingBalance}`,
      );
    }

    const result = await this.emiService.payEmiInternal(loan.id, amount);

    if (amount === remainingBalance) {
      link.isUsed = true;
      await this.paymentLinkRepo.save(link);
    }

    return result;
  }
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
}
