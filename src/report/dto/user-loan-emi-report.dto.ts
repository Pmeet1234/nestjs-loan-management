import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UserLoanEmiReportDto {
  // ─── Search ────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  search?: string; // searches username, mobile_no, loanId, userId, status

  // ─── EMI Date Filter ───────────────────────────────────────────
  @IsOptional()
  @IsDateString()
  startDate?: string; // emi dueDate from

  @IsOptional()
  @IsDateString()
  endDate?: string; // emi dueDate to

  // ─── EMI Number Filter ─────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  emiNumber?: number;

  // ─── Pagination ────────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  // ─── Flags ─────────────────────────────────────────────────────
  @IsOptional()
  @IsIn(['true', 'false'])
  showAll?: string;

  @IsOptional()
  @IsIn(['csv', 'json'])
  download?: string;
}
