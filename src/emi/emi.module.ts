import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmiController } from './emi.controller';
import { EmiService } from './emi.service';
import { EmiPayment } from './entities/emi-payment.entity';
import { Loan } from '../loan/entities/loan.entity'; // ✅ fixed path
import { PaymentLink } from './entities/payment-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmiPayment, Loan, PaymentLink])],
  controllers: [EmiController],
  providers: [EmiService],
})
export class EmiModule {}
