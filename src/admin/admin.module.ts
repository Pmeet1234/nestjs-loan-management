import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../user/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User]),
    JwtModule.register({
      secret: 'mySecretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
