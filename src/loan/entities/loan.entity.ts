import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

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

  @Column({ default: 'APPROVED' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  emiCount!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  emiAmount!: number;
  F;

  @ManyToOne(() => User, (user) => user.loans)
  user!: User;
}
