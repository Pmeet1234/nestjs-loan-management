/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import * as fs from 'fs';
import { BankStatement } from './entities/bank-statement.entity';

@Injectable()
export class StatementService {
  constructor(
    private httpService: HttpService,
    @InjectRepository(BankStatement)
    private statementRepo: Repository<BankStatement>,
  ) {}

  async uploadBankStatement(
    filePath: string,
    originalname: string,
  ): Promise<any> {
    const formData = new FormData();
    formData.append('bankCode', 'ICICI');
    formData.append('pdfFile', fs.createReadStream(filePath), {
      filename: originalname,
      contentType: 'application/pdf',
    });
    const response = await firstValueFrom(
      this.httpService.post(
        'http://localhost:9000/api/v1/statement/extractDataBank',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: 'Bearer your-real-token-here',
          },
        },
      ),
    );
    fs.unlinkSync(filePath);
    // Return request_id from third party response
    return {
      message: 'PDF uploaded successfully',
      filename: originalname,
      request_id: response.data.request_id,
    };
  }

  //  STEP 2: Pass request_id → mock server returns real PDF data → save to DB
  async getBankSummary(requestId: string): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post(
        'http://localhost:9000/api/v1/statement/getExtractSummary',
        { request_id: requestId },
        {
          headers: {
            Authorization: 'Bearer your-real-token-here',
          },
        },
      ),
    );

    const data: any = response.data;

    const newStatement = this.statementRepo.create({
      requestId: requestId,
      accountNumber: data.account_number,
      accountHolderName: data.account_holder_name,
      totalCredit: data.total_credit,
      totalDebit: data.total_debit,
      closingBalance: data.closing_balance,
      rawResponse: data,
    });

    await this.statementRepo.save(newStatement);
    return newStatement;
  }

  async findOneStatement(requestId: string): Promise<any> {
    return await this.statementRepo.findOne({
      where: { requestId },
    });
  }
}
