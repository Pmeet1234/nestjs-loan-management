import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class AddCompanyDto {
  // @IsString()
  // @IsNotEmpty()
  // mobile_no: string = '';

  @IsString()
  @IsNotEmpty()
  company_name: string = '';

  @IsNumber()
  @Min(10000, { message: 'Not eligible. Salary must be above 10,000' })
  salary: number = 0;
}
