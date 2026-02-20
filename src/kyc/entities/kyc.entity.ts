import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Kyc {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  adharcard_no: string = '';

  @Column()
  pancard_no!: string;

  @OneToOne(() => User, (user) => user.kyc)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
