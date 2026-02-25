/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import md5 from 'md5';
import { Admin } from './entities/admin.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    private jwtService: JwtService,
  ) {}

  private hashPassword(password: string): string {
    return md5(password);
  }
  async signup(email: string, password: string) {
    const existingAdmin = await this.adminRepository.findOne({
      where: { email },
    });

    if (existingAdmin) {
      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Email already exists.',
        timestamp: new Date().toISOString(),
      });
    }

    const hashedPassword = this.hashPassword(password);
    const admin = this.adminRepository.create({
      email,
      password: hashedPassword,
    });

    try {
      await this.adminRepository.save(admin);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Email already exists');
      }

      throw error;
    }

    return {
      success: true,
      statusCode: 201,
      message: 'Admin registered successfully.',
      data: {
        email: admin.email,
        role: 'admin',
      },
    };
  }

  async login(email: string, password: string) {
    const admin = await this.adminRepository.findOne({
      where: { email },
    });

    const hashedPassword = this.hashPassword(password);
    if (!admin || admin.password !== hashedPassword) {
      throw new UnauthorizedException({
        success: false,
        statusCode: 401,
        message: 'Invalid credentials.',
      });
    }
    const token = this.jwtService.sign({
      id: admin.id,
      role: 'admin',
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Admin login successful.',
      data: {
        access_token: token,
        role: 'admin',
      },
    };
  }

  async approveEmployment(mobile_no: string) {
    const user = await this.userRepository.findOne({
      where: { mobile_no },
    });

    if (!user) {
      throw new BadRequestException({
        success: false,
        statusCode: 404,
        message: 'User not found.',
      });
    }
    user.isEmploymentApproved = true;

    await this.userRepository.save(user);

    return {
      success: true,
      statusCode: 200,
      message: 'Employment approved successfully.',
      data: {
        mobile_no: user.mobile_no,
        employmentStatus: 'approved',
      },
    };
  }
}
