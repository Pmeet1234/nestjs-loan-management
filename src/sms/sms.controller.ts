import { Controller, Get } from '@nestjs/common';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('test-sms')
  async testSms() {
    await this.smsService.sendWhatsapp('9558895075', 'Test SMS 🚀');
    return 'SMS sent';
  }
}
