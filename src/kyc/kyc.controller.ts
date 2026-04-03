import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Get,
} from '@nestjs/common';

import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AddKycDto } from 'src/auth/dto/kyc.dto';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add-kyc')
  addKyc(@Request() req: RequestWithUser, @Body() body: AddKycDto) {
    const mobile_no = req.user.mobile_no;

    return this.kycService.addKycDetails(
      mobile_no,
      body.adharcard_no,
      body.pancard_no,
    );
  }

  @Get('getKycDetails')
  getKyc(@Query('mobile_no') mobile_no: string) {
    return this.kycService.getKycDetails(mobile_no);
  }
}
