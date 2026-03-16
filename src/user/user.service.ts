import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserDto } from '../auth/dto/user.dto';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  // ─── GET ALL USERS ────────────────────────────────────────────
  async findAllUser() {
    return this.userRepo.find({ relations: ['company', 'kyc'] });
  }

  // ─── GET USER BY MOBILE NUMBER ────────────────────────────────
  async findOneUser(mobile_no: string): Promise<UserDto> {
    const user = await this.userRepo.findOne({
      where: { mobile_no },
      relations: ['company', 'kyc'],
    });

    if (!user)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'User not found.',
      });

    return user;
  }
}
