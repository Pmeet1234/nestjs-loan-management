import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string = '';

  @IsString()
  @Length(10, 10)
  @Matches(/^[0-9]+$/)
  mobile: string = '';
}
