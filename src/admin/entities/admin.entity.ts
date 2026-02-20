import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;
}
