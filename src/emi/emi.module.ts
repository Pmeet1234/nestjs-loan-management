import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmiController } from './emi.controller';
import { EmiService } from './emi.service';
import { EmiPayment } from './entities/emi-payment.entity';
import { Loan } from '../loan/entities/loan.entity'; // ✅ fixed path

@Module({
  imports: [TypeOrmModule.forFeature([EmiPayment, Loan])],
  controllers: [EmiController],
  providers: [EmiService],
})
export class EmiModule {}
