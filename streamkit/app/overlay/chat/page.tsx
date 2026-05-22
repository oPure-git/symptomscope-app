'use client';
import { useState, useEffect } from 'react';
import { useStreamEvents } from '@/lib/useStreamEvents';
import type { ChatMessage } from '@/lib/types';

const MAX_MESSAGES = 10;
const FADE_AFTER = 28_000;

interface LiveMessage extends ChatMessage {
  fading: boolean;
}

export default function ChatOverlay() {
  const [messages, setMessages] = useState<LiveMessage[]>([]);

  useStreamEvents({
    chat: (msg: ChatMessage) => {
      setMessages(prev => {
        const next: LiveMessage[] = [...prev, { ...msg, fading: false }];
        return next.slice(-MAX_MESSAGES);
      });

      // Schedule fade-out
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, fading: true } : m));
      }, FADE_AFTER);

      // Remove after fade
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }, FADE_AFTER + 700);
    },
  });

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 20,
      width: '380px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      pointerEvents: 'none',
    }}>
      {messages.map(msg => (
        <div key={msg.id} style={{
          animation: 'chat-in .3s ease-out forwards',
          opacity: msg.fading ? 0 : 1,
          transition: msg.fading ? 'opacity .7s ease' : undefined,
        }}>
          <div style={{
            background: 'rgba(14,14,16,.82)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.08)',
            borderLeft: `3px solid ${msg.color || '#9147ff'}`,
            borderRadius: '8px',
            padding: '8px 12px',
            maxWidth: '100%',
          }}>
            {/* Badges + username row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              {msg.badges.map((b, i) => (
                <span key={i} style={{
                  fontSize: '10px', fontWeight: 700,
                  padding: '1px 6px', borderRadius: '4px',
                  background: b.color || 'rgba(145,71,255,.25)',
                  color: '#efeff1',
                  letterSpacing: '.4px',
                }}>
                  {b.label}
                </span>
              ))}
              <span style={{
                fontSize: '13px', fontWeight: 800,
                color: msg.color || '#9147ff',
                textShadow: `0 0 8px ${msg.color || '#9147ff'}80`,
              }}>
                {msg.username}
              </span>
            </div>

            {/* Message text */}
            <div style={{
              fontSize: '14px',
              color: '#efeff1',
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}>
              {msg.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
