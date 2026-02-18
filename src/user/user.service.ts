import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UserDto } from '../auth/dto/user.dto';
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Get all users
  async findAll(): Promise<UserDto[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        mobile_no: true,
      },
    });
  }

  // Get one user by mobile number
  async findOne(mobile_no: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { mobile_no },
      select: {
        id: true,
        username: true,
        mobile_no: true,
      },
    });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }
}
