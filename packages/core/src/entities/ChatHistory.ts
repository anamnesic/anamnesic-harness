import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface ChatMessage {
  id: string;
  timestamp: string;
  sender: string;
  senderLabel?: string;
  content: string;
  projectId?: string;
  type: 'request' | 'response' | 'info' | 'error' | 'code';
  replyTo?: string;
  read?: boolean;
  mentions?: string[];
}

@Entity('chat_history')
@Index(['projectId', 'pipelineId'])
@Index(['channel', 'createdAt'])
export class ChatHistory {
  @PrimaryColumn('varchar')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', nullable: true })
  pipelineId?: string;

  @Column({ type: 'varchar', default: 'default' })
  channel!: string;

  @Column({ type: 'varchar' })
  workspace!: string;

  @Column({ type: 'json' })
  messages!: ChatMessage[];

  @Column({ type: 'integer', default: 0 })
  messageCount!: number;

  @Column({ type: 'varchar', nullable: true })
  lastBackup?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}