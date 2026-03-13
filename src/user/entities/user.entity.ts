import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { OneToOne } from 'typeorm';
import { Kyc } from '../../kyc/entities/kyc.entity';
import { Loan } from 'src/loan/entities/loan.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn({ name: 'userId' })
  id!: number;

  @Column({ nullable: true })
  username: string = '';

  @Column({ unique: true })
  mobile_no: string = '';

  @Column({ nullable: true })
  password: string = '';

  @Column({ type: 'int', nullable: true })
  otp!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiry!: Date | null;

  @Column({ default: false })
  isVerified!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToOne(() => Company, (company) => company.user)
  company!: Company;

  @OneToOne(() => Kyc, (kyc) => kyc.user)
  kyc!: Kyc;

  @Column({ default: false })
  isEmploymentApproved!: boolean;

  @OneToMany(() => Loan, (loan) => loan.user)
  loans!: Loan[];

  @Column({ default: false })
  hasAppliedLoan!: boolean;
  displayTime: any;
}
