import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
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
  @Column({ default: 0 })
  amountPaid!: number;

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
}
