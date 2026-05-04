import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SessionMessage } from './SessionMessage';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: true })
  title: string | null;

  @Column('text', { nullable: true })
  autoTitle: string | null;

  @Column('integer', { default: 0 })
  messageCount: number;

  @Column('integer', { default: 0 })
  totalTokens: number;

  @Column('integer', { nullable: true })
  contextWindowSize: number | null;

  @Column('integer', { nullable: true })
  maxContextWindow: number | null;

  @Column('boolean', { default: false })
  isArchived: boolean;

  @Column('text', { nullable: true })
  model: string | null;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any> | null;

  @Column('text', { nullable: true })
  lancedbTable: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SessionMessage, (message) => message.session, {
    cascade: true,
  })
  messages: SessionMessage[];
}
