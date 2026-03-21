import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  // ─── GET ALL USERS ────────────────────────────────────────────
  findAllUser() {
    return this.userRepo.find({ relations: ['company', 'kyc'] });
  }

  // ─── GET USER BY MOBILE NUMBER ────────────────────────────────
  async findOneUser(mobile_no: string): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { mobile_no },
      relations: ['company', 'kyc'],
    });

    if (!user)
      throw new NotFoundException({
        message: 'User not found.',
      });

    return user;
  }

  findRelations(username: string) {
    return this.userRepo.find({
      where: { username },
      relations: ['loans', 'loans.emiPayments'],
    });
  }
}
