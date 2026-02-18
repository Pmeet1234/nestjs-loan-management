import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { verifyOtpDto } from './dto/verify-otp.dto';
import { setPasswordDto } from './dto/set-password.dto';
import { LoginDto } from './dto/login.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
  @Post('verify-otp') verifyOtp(@Body() body: verifyOtpDto) {
    return this.authService.verifyOtp(body.mobile_no, body.otp);
  }
  @Post('create-password') createPassword(@Body() body: setPasswordDto) {
    return this.authService.createPassword(
      body.mobile_no,
      body.create_password,
      body.confirm_password,
    );
  }
  @Post('login') login(@Body() body: LoginDto) {
    return this.authService.login(body.mobile_no, body.password);
  }
}
