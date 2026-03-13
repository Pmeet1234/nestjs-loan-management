import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { UserDto } from '../auth/dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Get all users
  async findAllUser() {
    const users = await this.userRepository.find({
      relations: ['company', 'kyc'],
    });
    return users;
  }

  // Get one user by mobile number
  async findOneUser(mobile_no: string): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { mobile_no },
      relations: ['company', 'kyc'],
    });

    if (!user) {
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'User not found.',
      });
    }

    return user;
  }
}
