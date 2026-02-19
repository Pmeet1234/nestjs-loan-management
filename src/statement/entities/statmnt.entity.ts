import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Statement {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  request_id: string = '';

  @Column()
  bankCode: string = '';

  @Column({ nullable: true })
  status: string = '';
}
