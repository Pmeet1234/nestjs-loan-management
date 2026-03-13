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
import { RegisterDto } from './dto/register.dto';
import { User } from '../user/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    // Inject User table repository to perform DB operations
    @InjectRepository(User)
    private userRepository: Repository<User>,
    //jwt service to generate token
    private jwtService: JwtService,
  ) {}

  generateOtp(): number {
    // return 123456;
    return Math.floor(100000 + Math.random() * 900000);
  }

  async register(data: RegisterDto) {
    const { username, mobile_no } = data;

    // Check if user already exists
    let user = await this.userRepository.findOne({
      where: { mobile_no },
    });

    if (user && user.password) {
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Mobile number already registered',
      });
    }

    if (user && user.otp && user.otpExpiry && new Date() < user.otpExpiry) {
      const remainingMs = user.otpExpiry.getTime() - new Date().getTime();
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: `OTP already sent. Please wait ${remainingSeconds} seconds before requesting a new one.`,
      });
    }

    const otp = this.generateOtp();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

    if (user) {
      //if user exists but not completed registration->update details
      user.username = username;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.isVerified = false;
    } else {
      //create new user if not exist
      user = this.userRepository.create({
        username,
        mobile_no,
        otp,
        otpExpiry,
        isVerified: false,
      });
    }
    //save user in db
    await this.userRepository.save(user);

    return {
      success: true,
      statuscode: 201,
      message:
        'OTP has been sent successfully to your registered mobile number.',
      data: {
        mobile_no,
        otp,
        expiresAt: otpExpiry,
      },
    };
  }

  async verifyOtp(mobile_no: string, otp: string) {
    const user = await this.userRepository.findOne({
      where: { mobile_no },
    });

    if (!user) {
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'User not found',
      });
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'OTP not found',
      });
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'OTP expired',
      });
    }

    if (user.otp !== parseInt(otp)) {
      throw new UnauthorizedException({
        success: false,
        statusCode: 401,
        message: 'Invalid OTP',
      });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await this.userRepository.save(user);

    return {
      success: true,
      statusCode: 201,
      message: 'OTP verified successfully.',
      data: {
        isVerified: true,
      },
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
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'User not found with the provided mobile number.',
      });
    }

    if (!user.isVerified) {
      throw new ForbiddenException({
        success: false,
        statusCode: 403,
        message:
          'Mobile number is not verified. Please verify OTP before creating password.',
      });
    }

    if (create_password !== confirm_password) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Password and confirm password do not match.',
      });
    }
    const hashedPassword = crypto
      .createHash('md5')
      .update(create_password)
      .digest('hex');
    user.password = hashedPassword;

    await this.userRepository.save(user);

    return {
      success: true,
      statusCode: 201,
      message: 'Password created successfully.',
      data: {
        mobile_no: user.mobile_no,
        passwordCreated: true,
      },
    };
  }

  async login(mobile_no: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { mobile_no },
    });
    const hashedInputPassword = crypto
      .createHash('md5')
      .update(password)
      .digest('hex');

    if (!user || !user.password) {
      throw new UnauthorizedException({
        success: false,
        statusCode: 401,
        message: 'Invalid mobile number or password.',
      });
    }

    if (hashedInputPassword !== user.password) {
      throw new UnauthorizedException({
        success: false,
        statusCode: 401,
        message: 'Invalid mobile number or password.',
      });
    }
    const payload = {
      id: user.id,
      mobile_no: user.mobile_no,
      username: user.username,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Login successful',
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
}
