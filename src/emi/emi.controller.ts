import {
  Controller,
  Post,
  Get,
  Body,
  // Param,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { EmiService } from './emi.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PayEmiDto } from 'src/auth/dto/pay_emi.dto';
@Controller('emi')
export class EmiController {
  constructor(private emiService: EmiService) {}

  @UseGuards(JwtAuthGuard)
  @Post('pay')
  async payEmi(@Body() body: PayEmiDto): Promise<any> {
    return await this.emiService.payEmi(body);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('status')
  async getEmiStatus(
    @Query('loanId', ParseIntPipe) loanId: number,
  ): Promise<any> {
    return await this.emiService.getEmiStatus(loanId);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('history')
  async getEmiHistory(
    @Query('loanId', ParseIntPipe) loanId: number,
  ): Promise<any> {
    return await this.emiService.getEmiHistory(loanId);
  }
}
