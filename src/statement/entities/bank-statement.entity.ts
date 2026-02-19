import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('bank_statement')
export class BankStatement {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  requestId: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  accountHolderName: string;

  @Column({ nullable: true })
  totalCredit: string;

  @Column({ nullable: true })
  totalDebit: string;

  @Column({ nullable: true })
  closingBalance: string;

  @Column({ type: 'jsonb', nullable: true })
  rawResponse: any;
}
