import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { EmiPayment } from 'src/emi/entities/emi-payment.entity';
export type LoanStatus = 'PENDING' | 'ACTIVE' | 'PAID';
@Entity()
export class Loan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  requestedAmount!: number;

  @Column()
  approvedAmount!: number;

  @Column()
  interestAmount!: number;

  @Column()
  totalPayable!: number;

  @CreateDateColumn()
  createdAt!: Date;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountPaid!: number; // 👈 must exist

  @Column()
  emiCount!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  emiAmount!: number;

  @Column({ default: 'active' })
  status!: string;

  @Column({ nullable: true })
  userId!: number;

  @ManyToOne(() => User, (user) => user.loans)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ default: 1 })
  totalLoansTaken!: number;

  @OneToMany(() => EmiPayment, (emi) => emi.loan)
  emiPayments!: EmiPayment[];
}
