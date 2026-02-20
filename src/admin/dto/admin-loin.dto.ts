import { IsString, Matches } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  username!: string;

  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=-])[A-Za-z\d@$!%*?&#^()_+=-]{8,}$/,
    {
      message:
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character',
    },
  )
  password!: string;
}
