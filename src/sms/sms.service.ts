import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private client;

  constructor(private configService: ConfigService) {
    this.client = twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  async sendSms(to: string, message: string): Promise<void> {
    try {
      // Ensure correct number format
      const fullNumber = to.startsWith('+91') ? to : `+91${to}`;

      const response = await this.client.messages.create({
        body: message,
        from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
        to: fullNumber,
      });

      console.log('✅ SMS SENT');
      console.log('To:', fullNumber);
      console.log('SID:', response.sid);
    } catch (error) {
      console.error('❌ SMS FAILED');
      console.error(error.message);
    }
  }
}
