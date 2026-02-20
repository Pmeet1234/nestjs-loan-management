import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-loin.dto';
import { AdminSignupDto } from './dto/admin-signup.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('signup')
  signup(@Body() body: AdminSignupDto) {
    return this.adminService.signup(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: AdminLoginDto) {
    return this.adminService.login(body.email, body.password);
  }
  @UseGuards(JwtAuthGuard)
  @Post('approve/:mobile_no')
  approve(@Param('mobile_no') mobile_no: string) {
    return this.adminService.approveEmployment(mobile_no);
  }
}
