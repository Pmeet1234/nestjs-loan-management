import { IsNotEmpty, IsString, Matches, Length } from 'class-validator';

export class verifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, {
    message: 'Mobile number must be 10-digit',
  })
  mobile_no: string = '';

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, {
    message: 'OTP must be 6-digit',
  })
  otp: string = '';
}
