import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ContextEntry } from './ContextEntry';
import { Decision } from './Decision';

@Entity()
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string | null;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => ContextEntry, (context) => context.project)
  contextEntries: ContextEntry[];

  @OneToMany(() => Decision, (decision) => decision.project)
  decisions: Decision[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
