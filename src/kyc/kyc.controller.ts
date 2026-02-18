import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { KycService } from './kyc.service';
import { AddKycDto } from 'src/auth/dto/kyc.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add-kyc')
  addKyc(@Req() req: RequestWithUser, @Body() body: AddKycDto) {
    const mobile_no = req.user.mobile_no;

    return this.kycService.addKycDetails(
      mobile_no,
      body.adharcard_no,
      body.pancard_no,
    );
  }
}
