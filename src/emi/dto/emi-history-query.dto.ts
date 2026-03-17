import {
  IsOptional,
  IsIn,
  IsString,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EmiHistoryQueryDto {
  // ─── Search ────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  search?: string; // searches userId, loanId, mobile_no

  // ─── EMI Due Date Filter ───────────────────────────────────────
  @IsOptional()
  @IsDateString()
  fromDate?: string; // emi dueDate from

  @IsOptional()
  @IsDateString()
  toDate?: string; // emi dueDate to

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
