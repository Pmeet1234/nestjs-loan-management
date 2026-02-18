import { Injectable, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { ProfileStep } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  generateOtp(): string {
    // return Math.floor(Math.random() * 900000) //generate randome number between 100000 and 999999
    //   .toString()
    //   .padStart(6, '0');
    return '123456'; // static for testing
  }

  async register(data: RegisterDto) {
    const { username, mobile_no } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: { mobile_no },
    });

    // If already fully registered
    if (existingUser && existingUser.password) {
      throw new BadRequestException('Mobile number already registered');
    }

    const otp = this.generateOtp();
    // const otpExpiry = new Date(Date.now() + 1 * 60 * 1000);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);

    // Create or update OTP
    await this.prisma.user.upsert({
      where: { mobile_no },
      update: {
        username,
        otp,
        otpExpiry,
        isVerified: false,
      },
      create: {
        username,
        mobile_no,
        otp,
        otpExpiry,
        isVerified: false,
      },
    });

    return {
      message: 'OTP sent successfully',
      otp: otp,
      expiresAt: otpExpiry,
    };
  }

  async verifyOtp(mobile_no: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { mobile_no },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException('OTP not found');
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP expired');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.user.update({
      where: { mobile_no },
      data: {
        isVerified: true,
        otp: null,
        otpExpiry: null,
      },
    });

    return {
      message: 'OTP verified successfully',
    };
  }

  async createPassword(
    mobile_no: string,
    create_password: string,
    confirm_password: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { mobile_no },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.isVerified) {
      throw new BadRequestException(
        'Mobile number not verified. Please verify OTP first.',
      );
    }

    if (create_password !== confirm_password) {
      throw new BadRequestException(
        'Password and Confirm Password do not match',
      );
    }

    await this.prisma.user.update({
      where: { mobile_no },
      data: {
        password: create_password,
        profileStep: ProfileStep.COMPANY,
      },
    });

    return {
      message: 'Password created successfully',
    };
  }

  async login(mobile_no: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { mobile_no },
    });

    if (!user || user.password !== password) {
      throw new BadRequestException('Invalid mobile number or password');
    }

    const payload = {
      mobile_no: user.mobile_no,
      username: user.username,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '10m',
    });

    return {
      message: 'Login successful',
      nextStep: user.profileStep,
      access_token: token,
      user: {
        username: user.username,
        mobile_no: user.mobile_no,
      },
    };
  }
}
