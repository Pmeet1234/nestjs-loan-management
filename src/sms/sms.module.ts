import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';

@Module({
  imports: [ConfigModule],
  providers: [SmsService],
  exports: [SmsService],
  controllers: [SmsController], // IMPORTANT
})
export class SmsModule {}
