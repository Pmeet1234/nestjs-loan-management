import { Controller, Post, Body } from '@nestjs/common';
import { KycService } from './kyc.service';
import { AddKycDto } from 'src/auth/dto/kyc.dto';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  addKyc(@Body() dto: AddKycDto) {
    return this.kycService.addKycDetails(
      dto.mobile_no,
      dto.adharcard_no,
      dto.pancard_no,
    );
  }
}
