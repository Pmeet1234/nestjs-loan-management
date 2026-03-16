import {
  IsOptional,
  IsString,
  IsIn,
  // IsNumberString,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class LoanReportQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsIn(['active', 'pending', 'defaulted', 'closed'])
  status?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'mobile_no must be a 10-digit number' })
  mobile_no?: string;

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

  @IsOptional()
  @IsIn(['csv', 'json'])
  download?: string;
}
