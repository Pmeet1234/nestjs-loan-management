/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { StatementService } from './statement.service';

@Controller('statement')
export class StatementController {
  constructor(private statementService: StatementService) {}

  @Post('submitBankDetails')
  async funcSubmitBankDetails() {
    return await this.statementService.uploadStatement();
  }

  @Post('summary')
  async summary(@Body('request_id') requestId: string) {
    return await this.statementService.getSummaryAndSave(requestId);
  }

  @Get('/getStatement/:requestId')
  async getOne(@Param('requestId') requestId: string) {
    return await this.statementService.findOneStatement(requestId);
  }
}
