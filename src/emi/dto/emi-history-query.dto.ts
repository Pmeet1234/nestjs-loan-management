import { IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class EmiHistoryQueryDto {
  // ─── Required
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  loanId!: number;

  // ─── Pagination
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @IsIn(['true', 'false'])
  showAll?: string;

  // ─── Download
  @IsOptional()
  @IsIn(['csv', 'json'])
  download?: string;
}
