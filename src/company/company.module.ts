import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { User } from 'src/user/entities/user.entity';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Company, User]), SmsModule],
  providers: [CompanyService],
  controllers: [CompanyController],
})
export class CompanyModule {}
