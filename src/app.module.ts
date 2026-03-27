import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { KycModule } from './kyc/kyc.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { StatementModule } from './statement/statement.module';
import { LoanModule } from './loan/loan.module';
import { AdminModule } from './admin/admin.module';
import { EmiModule } from './emi/emi.module';
import { ReportModule } from './report/report.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),

    AuthModule,
    CompanyModule,
    KycModule,
    UserModule,
    StatementModule,
    LoanModule,
    AdminModule,
    EmiModule,
    ReportModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
