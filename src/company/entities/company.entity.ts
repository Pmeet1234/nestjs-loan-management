import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
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

  @OneToOne(() => User, (user) => user.company, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user!: User;
}
