import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../user/entities/user.entity';
import { SmsService } from 'src/sms/sms.service';

@Injectable()
export class AuthService {
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly JWT_EXPIRY = '1h';

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private smsService: SmsService,
  ) {}

  // ─── REGISTER
  async register(dto: RegisterDto) {
    const { username, mobile_no } = dto;

    const existingUser = await this.userRepo.findOne({ where: { mobile_no } });

    if (existingUser?.password)
      throw new ConflictException({
        message: 'Mobile number already registered.',
      });

    if (
      existingUser?.otp &&
      existingUser?.otpExpiry &&
      new Date() < existingUser.otpExpiry
    ) {
      const remainingSeconds = Math.ceil(
        (existingUser.otpExpiry.getTime() - Date.now()) / 1000,
      );
      throw new BadRequestException({
        message: `OTP already sent. Please wait ${remainingSeconds} seconds before requesting a new one.`,
      });
    }

    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry();

    if (existingUser) {
      // User exists but registration incomplete — update details
      existingUser.username = username;
      existingUser.otp = otp;
      existingUser.otpExpiry = otpExpiry;
      existingUser.isVerified = false;
      await this.userRepo.save(existingUser);
    } else {
      // Fresh registration
      await this.userRepo.save(
        this.userRepo.create({
          username,
          mobile_no,
          otp,
          otpExpiry,
          isVerified: false,
        }),
      );
    }
    try {
      const smsNumber = '9558895075';
      await this.smsService.sendWhatsapp(
        smsNumber,
        `Your OTP for ${mobile_no} is ${otp}. It will expire in 5 minutes.`,
      );
    } catch (err) {
      console.error('SMS failed', (err as Error).message);
    }
    return {
      message: 'OTP sent successfully to your registered mobile number.',
      data: { mobile_no, otp, expiresAt: otpExpiry },
    };
  }

  // ─── VERIFY OTP
  async verifyOtp(mobile_no: string, otp: string) {
    const user = await this.findUserOrFail(mobile_no);

    if (!user.otp || !user.otpExpiry)
      throw new BadRequestException({
        message: 'OTP not found.',
      });

    if (new Date() > user.otpExpiry)
      throw new BadRequestException({
        message: 'OTP has expired.',
      });

    if (user.otp !== parseInt(otp))
      throw new UnauthorizedException({
        message: 'Invalid OTP.',
      });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await this.userRepo.save(user);

    try {
      const smsNumber = '9558895075';
      await this.smsService.sendWhatsapp(
        smsNumber,
        `You have successfully verified your mobile number ${mobile_no}. You can now create a password and log in.`,
      );
    } catch (err) {
      console.error('SMS failed', (err as Error).message);
    }
    return {
      message: 'OTP verified successfully.',
      data: { isVerified: true },
    };
  }

  // ─── CREATE PASSWORD
  async createPassword(
    mobile_no: string,
    create_password: string,
    confirm_password: string,
  ) {
    const user = await this.findUserOrFail(mobile_no);

    if (!user.isVerified)
      throw new ForbiddenException({
        message:
          'Mobile number not verified. Please verify OTP before creating a password.',
      });

    if (create_password !== confirm_password)
      throw new BadRequestException({
        message: 'Password and confirm password do not match.',
      });

    user.password = crypto
      .createHash('md5')
      .update(create_password)
      .digest('hex');
    await this.userRepo.save(user);

    try {
      const smsNumber = '9558895075';
      await this.smsService.sendWhatsapp(
        smsNumber,
        `password created successfully for mobile number ${mobile_no}. You can now log in using your credentials.`,
      );
    } catch (err) {
      console.error('SMS failed', (err as Error).message);
    }
    return {
      message: 'Password created successfully.',
      data: { mobile_no: user.mobile_no, passwordCreated: true },
    };
  }

  // ─── LOGIN
  async login(mobile_no: string, password: string) {
    const user = await this.userRepo.findOne({ where: { mobile_no } });

    const invalidCredentials = new UnauthorizedException({
      message: 'Invalid mobile number or password.',
    });

    if (!user?.password) throw invalidCredentials;

    const hashedInput = crypto.createHash('md5').update(password).digest('hex');
    if (hashedInput !== user.password) throw invalidCredentials;

    const token = this.jwtService.sign(
      { id: user.id, mobile_no: user.mobile_no, username: user.username },
      { expiresIn: this.JWT_EXPIRY },
    );

    try {
      const smsNumber = '9558895075';
      await this.smsService.sendWhatsapp(
        smsNumber,
        `user ${user.username} logged in successfully with mobile number ${mobile_no}. If this wasn't you, please secure your account immediately.`,
      );
    } catch (err) {
      console.error('SMS failed', (err as Error).message);
    }
    return {
      message: 'Login successful.',
      data: {
        access_token: token,
        user: {
          id: user.id,
          mobile_no: user.mobile_no,
          username: user.username,
        },
      },
    };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────
  private generateOtp(): number {
    return 123456;
    // return Math.floor(100000 + Math.random() * 900000);
  }

  private getOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiry;
  }

  private async findUserOrFail(mobile_no: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { mobile_no } });
    if (!user)
      throw new NotFoundException({
        message: 'User not found.',
      });
    return user;
  }
}
