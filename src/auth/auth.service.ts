import { Injectable, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private users: { mobile: string }[] = [];
  private otpStore = new Map<string, string>();

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  register(data: RegisterDto) {
    const existingUser = this.users.find((user) => user.mobile === data.mobile);

    if (existingUser) {
      throw new BadRequestException('Mobile number already registered');
    }

    const otp = this.generateOtp();

    this.otpStore.set(data.mobile, otp);

    return {
      message: 'OTP sent successfully',
      otp: otp, // Only for testing (in real app, send via SMS)
    };
  }

  verifyOtp(mobile: string, otp: string) {
    const storedOtp = this.otpStore.get(mobile);

    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    this.users.push({ mobile });

    this.otpStore.delete(mobile);

    return {
      message: 'Registration successful',
    };
  }
}
