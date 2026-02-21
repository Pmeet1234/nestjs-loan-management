import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { RegisterDto } from './dto/register.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    private jwtService: JwtService,
  ) {}

  generateOtp(): number {
    return 123456;
  }

  async register(data: RegisterDto) {
    const { username, mobile_no } = data;

    let user = await this.userRepository.findOne({
      where: { mobile_no },
    });

    if (user && user.password) {
      throw new BadRequestException('Mobile number already registered');
    }

    const otp = this.generateOtp();

    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);

    if (user) {
      user.username = username;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.isVerified = false;
    } else {
      user = this.userRepository.create({
        username,
        mobile_no,
        otp,
        otpExpiry,
        isVerified: false,
      });
    }

    await this.userRepository.save(user);

    return {
      message: 'OTP sent successfully',
      otp,
      expiresAt: otpExpiry,
    };
  }

  async verifyOtp(mobile_no: string, otp: string) {
    const user = await this.userRepository.findOne({
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

    if (user.otp !== parseInt(otp)) {
      throw new BadRequestException('Invalid OTP');
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await this.userRepository.save(user);

    return {
      message: 'OTP verified successfully',
    };
  }

  async createPassword(
    mobile_no: string,
    create_password: string,
    confirm_password: string,
  ) {
    const user = await this.userRepository.findOne({
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

    user.password = create_password;

    await this.userRepository.save(user);

    return {
      message: 'Password created successfully',
    };
  }

  async login(mobile_no: string, password: string) {
    const user = await this.userRepository.findOne({
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
      access_token: token,
      user: {
        username: user.username,
        mobile_no: user.mobile_no,
      },
    };
  }
}
