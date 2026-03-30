import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

import { EmiPayment } from '../emi/entities/emi-payment.entity';
import { Loan } from '../loan/entities/loan.entity';
import { EmiModule } from '../emi/emi.module';
import { PaymentLink } from './entites/payment-link.entity';
import { SmsModule } from 'src/sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentLink, EmiPayment, Loan]),
    EmiModule,
    SmsModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
