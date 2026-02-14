import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class AddCompanyDto {
  @IsString()
  @IsNotEmpty()
  mobile_no: string = '';

  @IsString()
  @IsNotEmpty()
  company_name: string = '';

  @IsNumber()
  @Min(10000, { message: 'Salary must be at least 10000' })
  salary: number = 0;
}
