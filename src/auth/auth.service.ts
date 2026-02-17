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

  // private users: {
  //   username: string;
  //   mobile_no: string;
  //   password: string;

  //   kyc?: {
  //     adharcard_no: string;
  //     pancard_no: string;
  //   };

  //   company?: {
  //     Company_name: string;
  //     salary: number;
  //   };

  //   profileStep?: ProfileStep;
  // }[] = [];

  private otpStore = new Map<
    string,
    { otp: string; username: string; expiresAt: number }
  >();

  private verifiedUsers = new Map<
    string,
    { username: string; verified: number }
  >();
  //Map<string, string> ---> <key, value> pair, key is mobile_no and value is Object(otp, username, expiresAt)

  // getAllUsers() {
  //   return this.users;
  // }

  generateOtp(): string {
    // return Math.floor(Math.random() * 900000) //generate randome number between 100000 and 999999
    //   .toString()
    //   .padStart(6, '0'); //Ensures total length is 6 digits
    return '123456'; //static otp
  }

  async register(data: RegisterDto) {
    const { username, mobile_no } = data;
    // const existingUser = this.users.find(
    //   (user) => user.mobile_no === mobile_no, //match mobile_no with existing user mobile_no
    // );

    const existingUser = await this.prisma.user.findUnique({
      where: { mobile_no },
    });

    if (existingUser) {
      //if mobile_no already exist in users array then throw error
      throw new BadRequestException('Mobile number already registered');
    }

    const existingOtp = this.otpStore.get(mobile_no); //check if otp already exist for the mobile_no in otpStore map

    if (existingOtp && Date.now() < existingOtp.expiresAt) {
      return {
        message: 'OTP resend successfully',
        otp: existingOtp.otp,
      };
    }
    // if (existingOtp) {
    //   if (Date.now() < existingOtp.expiresAt) {
    //     return {
    //       message: 'OTP resend Suceessfully',
    //       otp: existingOtp.otp,
    //     };
    //   }
    //   this.otpStore.delete(mobile_no);
    // }

    const otp = this.generateOtp(); //generateOtp() method is called to generate a 6-digit random OTP and store it in the otpStore map with the mobile number as the key. This allows us to later verify the OTP when the user attempts to verify it.

    const expiresAt = Date.now() + 1 * 60 * 1000;

    this.otpStore.set(mobile_no, {
      otp: otp,
      username: username,
      expiresAt: expiresAt,
    }); //store otp

    return {
      message: 'OTP sent successfully',
      otp: otp,
    };
  }

  async verifyOtp(mobile_no: string, otp: string) {
    // const existingUser = this.users.find(
    //   (user) => user.mobile_no === mobile_no,
    // );
    const existingUser = await this.prisma.user.findUnique({
      where: { mobile_no },
    });

    if (existingUser) {
      throw new BadRequestException('Mobile number already registered');
    }

    const storedData = this.otpStore.get(mobile_no); //retrive otp

    if (!storedData) {
      throw new BadRequestException('OTP not found');
    }

    if (Date.now() > storedData.expiresAt) {
      this.otpStore.delete(mobile_no);
      throw new BadRequestException('OTP expired');
    }

    if (storedData.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    this.verifiedUsers.set(mobile_no, {
      username: storedData.username,
      verified: Date.now(),
    });
    this.otpStore.delete(mobile_no);

    return {
      message: 'OTP verified successfully',
    };
  }

  async createPassword(
    mobile_no: string,
    create_password: string,
    confirm_password: string,
  ) {
    // const existingUser = this.users.find(
    //   (user) => user.mobile_no === mobile_no,
    // );
    const existingUser = await this.prisma.user.findUnique({
      where: { mobile_no },
    });

    if (existingUser) {
      throw new BadRequestException('User already registered');
    }

    const verifiedUser = this.verifiedUsers.get(mobile_no);

    if (!verifiedUser) {
      throw new BadRequestException(
        'Mobile number not verified. Please verify OTP first.',
      );
    }

    if (create_password !== confirm_password) {
      throw new BadRequestException(
        'Password and Confirm Password do not match',
      );
    }

    // this.users.push({
    //   username: verifiedUser.username,
    //   mobile_no,
    //   password: create_password,
    // });

    await this.prisma.user.create({
      data: {
        username: verifiedUser.username,
        mobile_no,
        password: create_password,
        profileStep: ProfileStep.COMPANY,
      },
    });

    this.verifiedUsers.delete(mobile_no);

    return {
      message: ' Password Create successfully',
      // user: {
      //   username: verifiedUser.username,
      //   mobile_no,
      //   password: create_password,
      // },
    };
  }

  async login(mobile_no: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { mobile_no },
    });
    // const user = this.users.find((user) => user.mobile_no === mobile_no);

    if (!user || user.password !== password) {
      throw new BadRequestException('Invalid mobile number or password');
    }

    if (!user.profileStep) {
      user.profileStep = ProfileStep.COMPANY;
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
