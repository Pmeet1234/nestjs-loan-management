/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { StatementService } from './statement.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('Bankstatement')
export class StatementController {
  constructor(private statementService: StatementService) {}

  @Post('submitBankDetails')
  @UseInterceptors(
    FileInterceptor('pdfFile', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException('Only PDF files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadBankStatement(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Use field name: pdfFile',
      );
    }

    return this.statementService.uploadBankStatement(
      file.path,
      file.originalname,
    );
  }

  @Post('getBankSummary')
  async getBankSummary(@Body('request_id') requestId: string) {
    return await this.statementService.getBankSummary(requestId);
  }

  @Get('/getStatement/:requestId')
  async getOne(@Param('requestId') requestId: string) {
    return await this.statementService.findOneStatement(requestId);
  }
}
