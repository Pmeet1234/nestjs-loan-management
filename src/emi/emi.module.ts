import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmiController } from './emi.controller';
import { EmiService } from './emi.service';
import { EmiPayment } from './entities/emi-payment.entity';
import { Loan } from '../loan/entities/loan.entity'; // ✅ fixed path
import { PaymentLink } from '../payment/entites/payment-link.entity';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmiPayment, Loan, PaymentLink]),
    SmsModule,
  ],
  controllers: [EmiController],
  providers: [EmiService],
  exports: [EmiService],
})
export class EmiModule {}
