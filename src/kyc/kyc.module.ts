import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { Kyc } from './entities/kyc.entity';
import { User } from '../user/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { SmsModule } from 'src/sms/sms.module';

@Module({
  imports: [TypeOrmModule.forFeature([Kyc, User]), AuthModule, SmsModule],
  providers: [KycService],
  controllers: [KycController],
})
export class KycModule {}
