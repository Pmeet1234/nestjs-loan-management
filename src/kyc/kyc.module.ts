import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { AuthModule } from 'src/auth/auth.module';
import { CompanyModule } from 'src/company/company.module';

@Module({
  imports: [AuthModule, CompanyModule, KycModule],
  providers: [KycService],
  controllers: [KycController],
})
export class KycModule {}
