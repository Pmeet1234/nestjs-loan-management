import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Statement } from './entities/statmnt.entity';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import { ExtractResponseDto } from 'src/auth/dto/extract-response.dto';
import { SummaryResponseDto } from 'src/auth/dto/summary-respone.dto';

@Injectable()
export class StatementService {
  constructor(
    private httpService: HttpService,
    @InjectRepository(Statement)
    private statementRepo: Repository<Statement>,
  ) {}

  private BASE_URL = 'http://localhost:9000/api/v1/statement';

  private TOKEN = 'YOUR_BEARER_TOKEN_HERE';

  async extractBankStatmentData(
    bankCode: string,
    filePath: string,
  ): Promise<ExtractResponseDto> {
    const formData = new FormData();
    formData.append('bankCode', bankCode);
    formData.append('pdfFile', fs.createReadStream(filePath));

    const response = await firstValueFrom(
      this.httpService.post<ExtractResponseDto>(
        `${this.BASE_URL}/extractDataBank`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.TOKEN}`,
          },
        },
      ),
    );

    return response.data;
  }

  async getBankStatmentSummary(
    request_id: string,
  ): Promise<SummaryResponseDto> {
    const response = await firstValueFrom(
      this.httpService.post<SummaryResponseDto>(
        `${this.BASE_URL}/getExtractSummary`,
        { request_id },
        {
          headers: {
            Authorization: `Bearer ${this.TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    return response.data;
  }
}
