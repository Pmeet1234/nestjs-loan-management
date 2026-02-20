import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyLoanDto {
  @Type(() => Number)
  @IsNumber()
  @Min(10000)
  @Max(100000)
  requestedAmount!: number;
}
