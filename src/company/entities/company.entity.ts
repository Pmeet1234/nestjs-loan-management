import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  company_name: string = '';

  @Column('decimal')
  salary!: number;

  @OneToOne(() => User, (user) => user.company)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
