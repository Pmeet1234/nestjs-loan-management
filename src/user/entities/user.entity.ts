import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProfileStep } from '../enums/profile-step.enum';
import { Company } from '../../company/entities/company.entity';
import { OneToOne } from 'typeorm';
import { Kyc } from '../../kyc/entities/kyc.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
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

  @Column({
    type: 'enum',
    enum: ProfileStep,
    default: ProfileStep.COMPANY,
  })
  profileStep!: ProfileStep;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
  @OneToOne(() => Company, (company) => company.user)
  company!: Company;

  @OneToOne(() => Kyc, (kyc) => kyc.user)
  kyc!: Kyc;
}
