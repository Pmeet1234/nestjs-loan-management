import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBankDto {
  @IsString()
  @IsNotEmpty()
  mobile_no: string = '';

  @IsString()
  @IsNotEmpty()
  account_number: string = '';

  @IsString()
  @IsNotEmpty()
  ifsc_code: string = '';

  @IsString()
  @IsNotEmpty()
  bank_name: string = '';
}
