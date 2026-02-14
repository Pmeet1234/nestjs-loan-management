import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('verify-otp')
  verifyOtp(@Body('mobile') mobile: string, @Body('otp') otp: string) {
    return this.authService.verifyOtp(mobile, otp);
  }
}
