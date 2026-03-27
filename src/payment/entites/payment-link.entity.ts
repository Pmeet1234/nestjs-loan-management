// src/emi/entities/payment-link.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('payment_link')
export class PaymentLink {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  loanId: number = 0;

  @Column()
  emiNumber: number = 0;

  @Column()
  token?: string;

  @Column({ default: false })
  isUsed?: boolean;
}
