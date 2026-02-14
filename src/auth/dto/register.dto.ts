import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  username: string = '';

  @IsString()
  @Length(10, 10)
  @Matches(/^[0-9]{10}$/, {
    message: 'Mobile number must be  10-digit ',
  })
  mobile_no: string = '';
}
