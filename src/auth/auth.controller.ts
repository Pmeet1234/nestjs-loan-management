import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { verifyOtpDto } from './dto/verify-otp.dto';
import { setPasswordDto } from './dto/set-password.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('users')
  getUsers() {
    return this.authService.getAllUsers();
  }

  @Post('register')
  register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: verifyOtpDto) {
    return this.authService.verifyOtp(dto.mobile_no, dto.otp);
  }
  @Post('create-password')
  createPassword(@Body() dto: setPasswordDto) {
    return this.authService.createPassword(
      dto.mobile_no,
      dto.create_password,
      dto.confirm_password,
    );
  }
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.mobile_no, dto.password);
  }
}
