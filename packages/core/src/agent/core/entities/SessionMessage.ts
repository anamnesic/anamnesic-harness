import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Session } from './Session';

@Entity()
@Index(['sessionId', 'createdAt'])
export class SessionMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  sessionId: string;

  @ManyToOne(() => Session, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  session: Session;

  @Column('text')
  role: 'user' | 'assistant' | 'system';

  @Column('text')
  content: string;

  @Column('integer')
  tokenCount: number;

  @Column('integer', { nullable: true })
  promptTokens: number | null;

  @Column('integer', { nullable: true })
  completionTokens: number | null;

  @Column('text', { nullable: true })
  model: string | null;

  @Column('text', { nullable: true })
  lancedbId: string | null;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
