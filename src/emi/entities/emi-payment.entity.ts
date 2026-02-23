import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('emi_payment')
export class EmiPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  loanId!: number;

  @Column()
  userId!: number;

  @Column()
  emiNumber!: number;

  @Column({ type: 'decimal' })
  emiAmount!: number;

  @Column({ type: 'decimal', default: 0 })
  penaltyAmount!: number;

  @Column({ type: 'decimal' })
  totalPaid!: number;

  @Column()
  dueDate!: Date;

  @Column({ nullable: true })
  paidDate!: Date;

  @Column({ default: 'pending' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
