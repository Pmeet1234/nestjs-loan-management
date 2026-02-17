import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { KycService } from './kyc/kyc.service';
import { KycController } from './kyc/kyc.controller';
import { KycModule } from './kyc/kyc.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, CompanyModule, KycModule, PrismaModule],
  controllers: [AppController, KycController],
  providers: [AppService, KycService],
})
export class AppModule {}
