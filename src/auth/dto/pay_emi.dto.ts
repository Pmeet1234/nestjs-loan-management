import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PayEmiDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Loan ID must be valid.' })
  loanId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0.' })
  amount!: number;

  calculatePenalty(emiAmount: number): number {
    return parseFloat((emiAmount * 0.02).toFixed(2));
  }

  calculateTotalPaid(penaltyAmount: number): number {
    return parseFloat((this.amount + penaltyAmount).toFixed(2));
  }

  isOverPayment(totalPaid: number, remainingBalance: number): boolean {
    return totalPaid > remainingBalance;
  }

  calculateNewTotalPaid(
    totalAmountPaidSoFar: number,
    totalPaid: number,
  ): number {
    return parseFloat((totalAmountPaidSoFar + totalPaid).toFixed(2));
  }

  isLoanCompleted(
    emiNumber: number,
    emiCount: number,
    newTotalAmountPaid: number,
    totalPayable: number,
  ): boolean {
    return emiNumber === emiCount || newTotalAmountPaid >= totalPayable;
  }

  isLoanDefaulted(loanCreatedAt: Date, emiCount: number): boolean {
    const loanEndDate = new Date(loanCreatedAt);
    loanEndDate.setMonth(loanEndDate.getMonth() + emiCount);
    return new Date() > loanEndDate;
  }

  getEmiDueDate(loanCreatedAt: Date, emiNumber: number): Date {
    const dueDate = new Date(loanCreatedAt);
    dueDate.setMonth(dueDate.getMonth() + emiNumber);
    return dueDate;
  }

  isDelayed(dueDate: Date): boolean {
    return new Date() > dueDate;
  }
}
