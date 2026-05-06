'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Message = { role: 'user' | 'assistant'; content: string; ts: number };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    const assistantMsg: Message = { role: 'assistant', content: '', ts: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.type === 'chunk' && ev.content) {
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + ev.content };
                return copy;
              });
            }
          } catch {}
        }
      }
    } finally {
      setStreaming(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: 'var(--color-highlight)', flexShrink: 0 }}>Chat</h1>

        {/* messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', marginTop: 80, fontSize: 14 }}>
              Send a message to start a conversation with Kairos.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '72%',
                  padding: '12px 16px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-card)',
                  border: m.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                  color: m.role === 'user' ? '#000' : 'var(--color-highlight)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content || (streaming && m.role === 'assistant' ? <span style={{ opacity: 0.5 }}>▌</span> : '')}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* input */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Message Kairos…"
            disabled={streaming}
            style={{
              flex: 1,
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              color: 'var(--color-highlight)',
              outline: 'none',
            }}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              background: streaming || !input.trim() ? 'var(--color-border)' : 'var(--color-primary)',
              border: 'none',
              color: streaming || !input.trim() ? 'var(--color-accent)' : '#000',
              fontWeight: 600,
              fontSize: 14,
              cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {streaming ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
