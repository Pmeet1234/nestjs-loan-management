import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportService } from './report.service';
import { ReportController } from './report.controller';

import { User } from '../user/entities/user.entity';
import { Loan } from '../loan/entities/loan.entity';
import { EmiPayment } from '../emi/entities/emi-payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Loan, EmiPayment])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
