import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { StatementService } from './statement.service';
import { StatementController } from './statement.controller';
import { BankStatement } from './entities/bank-statement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BankStatement]), HttpModule],
  controllers: [StatementController],
  providers: [StatementService],
})
export class StatementModule {}
