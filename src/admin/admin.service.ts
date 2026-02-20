/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

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

  async signup(email: string, password: string) {
    const existingAdmin = await this.adminRepository.findOne({
      where: { email },
    });

    if (existingAdmin) {
      throw new BadRequestException('Email already exists');
    }

    const hash = await bcrypt.hash(password, 10);

    const admin = this.adminRepository.create({
      email,
      password: hash,
    });

    try {
      await this.adminRepository.save(admin);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Email already exists');
      }

      throw error;
    }

    return { message: 'Admin registered successfully' };
  }

  async login(email: string, password: string) {
    const admin = await this.adminRepository.findOne({
      where: { email },
    });

    if (!admin || !(await bcrypt.compare(password, admin.password)))
      throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({
      id: admin.id,
      role: 'admin',
    });

    return { access_token: token, message: 'Admin Login Successfully' };
  }

  async approveEmployment(mobile_no: string) {
    const user = await this.userRepository.findOne({
      where: { mobile_no },
    });

    if (!user) throw new BadRequestException('User not found');

    user.isEmploymentApproved = true;

    await this.userRepository.save(user);

    return { message: 'Employment Approved Successfully' };
  }
}
