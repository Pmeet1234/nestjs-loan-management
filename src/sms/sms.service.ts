/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private client;
  constructor(private ConfigService: ConfigService) {
    this.client = twilio(
      this.ConfigService.get<string>('TWILIO_ACCOUNT_SID'),
      this.ConfigService.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }
  async sendWhatsapp(to: string, message: string) {
    try {
      const fullNumber = to.startsWith('+91') ? to : `+91${to}`;

      const response = await this.client.messages.create({
        body: message,
        from: this.ConfigService.get<string>('TWILIO_PHONE_NUMBER'), //from: this.ConfigService.get<string>('TWILIO_PHONE_NUMBER'),
        to: fullNumber,
        // to: `whatsapp:${fullNumber}`,
      });
      console.log('message sent to mobile number');
      console.log('to:', fullNumber);
      console.log('SID:', response.sid);
    } catch (err) {
      const error = err as Error;
      console.log('Failed to send  message');
      console.error(error.message);
    }
  }
}
