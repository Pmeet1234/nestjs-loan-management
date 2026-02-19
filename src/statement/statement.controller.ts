import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StatementService } from './statement.service';
import { diskStorage } from 'multer';

@Controller('getBankStatement')
export class StatementController {
  constructor(private statementService: StatementService) {}

  @Post('extract')
  @UseInterceptors(
    FileInterceptor('pdfFile', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, Date.now() + '-' + file.originalname);
        },
      }),
    }),
  )
  async extractBankStatmentData(
    @UploadedFile() file: Express.Multer.File,
    @Body('bankCode') bankCode: string,
  ) {
    return this.statementService.extractBankStatmentData(bankCode, file.path);
  }

  @Post('GetBankStatementSummary')
  async getBankStatmentSummary(@Body('request_id') request_id: string) {
    return this.statementService.getBankStatmentSummary(request_id);
  }
}
