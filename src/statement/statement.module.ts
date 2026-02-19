import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatementService } from './statement.service';
import { StatementController } from './statement.controller';
import { Statement } from './entities/statmnt.entity';
@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Statement])],
  controllers: [StatementController],
  providers: [StatementService],
})
export class StatementModule {}
