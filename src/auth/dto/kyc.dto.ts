import { Matches } from 'class-validator';

export class AddKycDto {
  @Matches(/^[0-9]{12}$/, {
    message: 'Aadhaar must be 12 digits',
  })
  adharcard_no: string = '';

  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN format',
  })
  pancard_no: string = '';
}
