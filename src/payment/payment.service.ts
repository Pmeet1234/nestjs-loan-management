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
import { formatDate } from 'src/common/utils/date.util';
import { SmsService } from 'src/sms/sms.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentLink)
    private paymentLinkRepo: Repository<PaymentLink>,

    @InjectRepository(EmiPayment)
    private emiRepo: Repository<EmiPayment>,

    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,

    private emiService: EmiService,
    private smsService: SmsService,
  ) {}

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  // EMI due date = loan start + emiNumber months
  private getEmiDueDate(loan: Loan, emiNumber: number): Date {
    const due = new Date(loan.createdAt);
    due.setMonth(due.getMonth() + emiNumber);
    return due;
  }

  // 10% penalty if payment is past due date, else 0
  private calcPenalty(loan: Loan, dueDate: Date): number {
    const isDelayed = new Date() > dueDate;
    return isDelayed ? Math.round(Number(loan.emiAmount) * 0.1) : 0;
  }

  // Count distinct EMI numbers already paid
  private async getPaidEmiCount(loanId: number): Promise<number> {
    const paidEmis = await this.emiRepo.find({ where: { loanId } });
    return new Set(paidEmis.map((e) => e.emiNumber)).size;
  }

  // Sum of all EMI payments made so far
  private async getTotalPaid(loanId: number): Promise<number> {
    const emis = await this.emiRepo.find({ where: { loanId } });
    return emis.reduce((sum, e) => sum + Number(e.totalPaid), 0);
  }

  // ─── GENERATE PAYMENT LINK ────────────────────────────────────

  async generatePaymentLink(loanId: number) {
    const loan = await this.loanRepo.findOne({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Loan not found');

    const paidCount = await this.getPaidEmiCount(loanId);
    const nextEmiNumber = paidCount + 1;

    if (nextEmiNumber > loan.emiCount) {
      throw new ConflictException('All EMIs already paid. Loan completed.');
    }

    // Invalidate any existing unused links before creating a new one
    await this.paymentLinkRepo
      .createQueryBuilder()
      .update(PaymentLink)
      .set({ isUsed: true })
      .where('loanId = :loanId AND isUsed = false', { loanId })
      .execute();

    const token = randomBytes(16).toString('hex');
    await this.paymentLinkRepo.save({
      loanId,
      emiNumber: nextEmiNumber,
      token,
      isUsed: false,
    });

    return {
      emiNumber: nextEmiNumber,
      totalEmis: loan.emiCount,
      remainingEmis: loan.emiCount - paidCount,
      url: `http://localhost:3000/pay.html?token=${token}`,
    };
  }

  // ─── GET EMI DETAILS BY TOKEN ─────────────────────────────────

  async getEmiDetailsByToken(token: string) {
    const link = await this.paymentLinkRepo.findOne({ where: { token } });
    if (!link) throw new NotFoundException('Invalid or expired link');

    const loan = await this.loanRepo.findOne({ where: { id: link.loanId } });
    if (!loan) throw new NotFoundException('Loan not found');

    const dueDate = this.getEmiDueDate(loan, link.emiNumber);
    const penalty = this.calcPenalty(loan, dueDate);
    const emiAmount = Number(loan.emiAmount);
    const totalPayable = Number(loan.totalPayable);

    const totalPaid = await this.getTotalPaid(loan.id);
    const paidCount = await this.getPaidEmiCount(loan.id);

    // What's still left to pay on the entire loan
    const remainingBalance = Math.max(
      parseFloat((totalPayable - totalPaid).toFixed(2)),
      0,
    );

    const loanEndDate = new Date(loan.createdAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + loan.emiCount);

    // Days until this EMI is due (0 if already past)
    const daysLeft = Math.max(
      Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000),
      0,
    );

    return {
      loanId: loan.id,
      emiNumber: link.emiNumber,
      isUsed: link.isUsed,

      loanAmount: Number(loan.approvedAmount),
      interestAmount: Number(loan.interestAmount),
      totalPayable,
      emiAmount,
      emiDueAmount: emiAmount + penalty, // base + penalty

      totalPaid,
      remainingBalance,
      remainingEmis: Math.max(loan.emiCount - paidCount, 0),

      penaltyAmount: penalty,
      isDelayed: new Date() > dueDate,
      daysLeft,

      dueDate: formatDate(dueDate),
      loanEndDate: formatDate(loanEndDate),
    };
  }

  // ─── PAY EMI BY TOKEN ─────────────────────────────────────────

  async payEmiByToken(token: string, amount: number) {
    const link = await this.paymentLinkRepo.findOne({ where: { token } });
    if (!link) throw new NotFoundException('Invalid or expired link');

    // Each link is single-use
    if (link.isUsed) {
      throw new ConflictException(
        'This payment link has already been used. Please generate a new link for the next EMI.',
      );
    }

    if (amount <= 0) throw new BadRequestException('Enter valid amount');

    // Load user relation to access mobile number for SMS
    const loan = await this.loanRepo.findOne({
      where: { id: link.loanId },
      relations: ['user'],
    });
    if (!loan) throw new NotFoundException('Loan not found');

    const dueDate = this.getEmiDueDate(loan, link.emiNumber);
    const penalty = this.calcPenalty(loan, dueDate);
    const exactDue = Number(loan.emiAmount) + penalty;
    const penaltyNote = penalty > 0 ? ` (includes ₹${penalty} penalty)` : '';

    // Enforce exact amount — no partial or excess payments
    if (amount < exactDue) {
      throw new BadRequestException(
        `Amount ₹${amount} is less than required ₹${exactDue} for EMI ${link.emiNumber}${penaltyNote}.`,
      );
    }

    if (amount > exactDue) {
      throw new BadRequestException(
        `Amount ₹${amount} exceeds required ₹${exactDue} for EMI ${link.emiNumber}. Please pay the exact amount.`,
      );
    }

    // Guard against overpaying the total loan balance
    const totalPaid = await this.getTotalPaid(loan.id);
    const remainingBalance = Math.max(
      parseFloat((Number(loan.totalPayable) - totalPaid).toFixed(2)),
      0,
    );

    if (amount > remainingBalance) {
      throw new BadRequestException(
        `Amount ₹${amount} exceeds remaining loan balance ₹${remainingBalance}.`,
      );
    }

    const result = await this.emiService.payEmiInternal(loan.id, amount);

    // Mark link as used so it can't be reused
    link.isUsed = true;
    await this.paymentLinkRepo.save(link);

    // Notify user via SMS — failure won't affect the payment result
    try {
      await this.smsService.sendWhatsapp(
        '9558895075', //loan.user.mobile,
        `Dear ${loan.user.username}, your EMI ${link.emiNumber} of ₹${amount} has been paid successfully.`,
      );
    } catch (err) {
      const error = err as Error;
      console.error('SMS failed but payment successful', error.message);
    }

    return result;
  }
}
