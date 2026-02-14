import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { verifyOtpDto } from './dto/verify-otp.dto';
import { setPasswordDto } from './dto/set-password.dto';
import { LoginDto } from './dto/login.dto';
import { AddCompanyDto } from './dto/company.dto';
import { AddKycDto } from './dto/kyc.dto';

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
    return this.authService.createPassword(dto.mobile_no, dto.password);
  }
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.mobile_no, dto.password);
  }
  @Post('add-company')
  addCompanyDetails(@Body() dto: AddCompanyDto) {
    return this.authService.addCompanyDetails(
      dto.mobile_no,
      dto.company_name,
      dto.salary,
    );
  }

  @Post('add-kyc')
  addKycDetails(@Body() dto: AddKycDto) {
    return this.authService.addKycDetails(
      dto.mobile_no,
      dto.adharcard_no,
      dto.pancard_no,
    );
  }
}
