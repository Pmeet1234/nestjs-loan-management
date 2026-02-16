import { Injectable, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private users: {
    username: string;
    mobile_no: string;
    password: string;
    company?: {
      Company_name: string;
      salary: number;
    };
    kyc?: {
      adharcard_no: string;
      pancard_no: string;
    };
  }[] = [];

  private otpStore = new Map<
    string,
    { otp: string; username: string; expiresAt: number }
  >();

  private verifiedUsers = new Map<
    string,
    { username: string; verified: number }
  >();
  //Map<string, string> ---> <key, value> pair, key is mobile_no and value is Object(otp, username, expiresAt)

  getAllUsers() {
    return this.users;
  }

  generateOtp(): string {
    // return Math.floor(Math.random() * 900000) //generate randome number between 100000 and 999999
    //   .toString()
    //   .padStart(6, '0'); //Ensures total length is 6 digits
    return '123456'; //static otp
  }

  register(data: RegisterDto) {
    const { username, mobile_no } = data;
    const existingUser = this.users.find(
      (user) => user.mobile_no === mobile_no, //match mobile_no with existing user mobile_no
    );
    if (existingUser) {
      //if mobile_no already exist in users array then throw error
      throw new BadRequestException('Mobile number already registered');
    }

    const existingOtp = this.otpStore.get(mobile_no); //check if otp already exist for the mobile_no in otpStore map
    if (existingOtp) {
      if (Date.now() < existingOtp.expiresAt) {
        return {
          message: 'OTP resend Suceessfully',
          otp: existingOtp.otp,
        };
      }
      this.otpStore.delete(mobile_no);
    }

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

  verifyOtp(mobile_no: string, otp: string) {
    const existingUser = this.users.find(
      (user) => user.mobile_no === mobile_no,
    );
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
      message: 'Registration successful',
    };
  }

  createPassword(
    mobile_no: string,
    create_password: string,
    confirm_password: string,
  ) {
    const existingUser = this.users.find(
      (user) => user.mobile_no === mobile_no,
    );

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

    this.users.push({
      username: verifiedUser.username,
      mobile_no,
      password: create_password,
    });

    this.verifiedUsers.delete(mobile_no);

    return {
      message: ' Password Create successfully',
      user: {
        username: verifiedUser.username,
        mobile_no,
        password: create_password,
      },
    };
  }

  login(mobile_no: string, password: string) {
    const user = this.users.find((user) => user.mobile_no === mobile_no);

    if (!user || user.password !== password) {
      throw new BadRequestException('Invalid mobile number or password');
    }

    return {
      message: 'Login successful',
      user: {
        username: user.username,
        mobile_no: user.mobile_no,
      },
    };
  }

  // addCompanyDetails(mobile_no: string, company_name: string, salary: number) {
  //   const user = this.users.find((user) => user.mobile_no === mobile_no);

  //   if (!user) {
  //     throw new BadRequestException('User not found');
  //   }

  //   user.company = {
  //     Company_name: company_name,
  //     salary: salary,
  //   };

  //   return {
  //     message: 'Company details added successfully',
  //     company: user.company,
  //   };
  // }

  // addKycDetails(mobile_no: string, adharcard_no: string, pancard_no: string) {
  //   const user = this.users.find((user) => user.mobile_no === mobile_no);

  //   if (!user) {
  //     throw new BadRequestException('User not found');
  //   }

  //   if (user.kyc) {
  //     throw new BadRequestException('KYC details already added');
  //   }

  //   user.kyc = {
  //     adharcard_no: adharcard_no,
  //     pancard_no: pancard_no,
  //   };

  //   return {
  //     message: 'KYC details added successfully',
  //     kyc: user.kyc,
  //   };
  // }
}
