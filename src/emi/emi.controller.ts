import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EmiService } from './emi.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('emi')
export class EmiController {
  constructor(private emiService: EmiService) {}

  @UseGuards(JwtAuthGuard)
  @Post('pay')
  async payEmi(
    @Request() req: RequestWithUser,
    @Body('loanId') loanId: number,
    @Body('amount') amount: number,
  ): Promise<any> {
    return await this.emiService.payEmi(Number(loanId), Number(amount));
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:loanId')
  async getEmiStatus(@Param('loanId') loanId: number): Promise<any> {
    return await this.emiService.getEmiStatus(loanId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history/:loanId')
  async getEmiHistory(@Param('loanId') loanId: number): Promise<any> {
    return await this.emiService.getEmiHistory(loanId);
  }
}
