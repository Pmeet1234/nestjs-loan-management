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

@Controller('statement')
export class StatementController {
  constructor(private statementService: StatementService) {}

  // ✅ STEP 1: Upload PDF → returns request_id
  @Post('submitBankDetails')
  @UseInterceptors(
    FileInterceptor('pdfFile', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // Keep original name, add timestamp to avoid collisions
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
  async uploadStatement(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Use field name: pdfFile',
      );
    }

    return this.statementService.uploadStatement(
      file.path, // ✅ dynamic path on disk
      file.originalname, // ✅ original filename from Postman
    );
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
