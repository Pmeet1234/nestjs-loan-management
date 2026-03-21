import {
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LoanReportQueryDto {
  // ─── Search ────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  search?: string; // searches userId, loanId, status, username, mobile_no

  // ─── Loan Date Filter ──────────────────────────────────────────
  @IsOptional()
  @IsDateString()
  fromDate?: string; // loan createdAt from

  @IsOptional()
  @IsDateString()
  toDate?: string; // loan createdAt to

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

  // @IsOptional()
  // @IsIn(['csv', 'json'])
  // download?: string;
}
