import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from './entities/loan.entity';
import { LoanService } from './loan.service';
import { LoanController } from './loan.controller';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Loan, User])],
  controllers: [LoanController],
  providers: [LoanService],
})
export class LoanModule {}
