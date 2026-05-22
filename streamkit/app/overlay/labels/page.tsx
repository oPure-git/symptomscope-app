'use client';
import { useState } from 'react';
import { useStreamEvents } from '@/lib/useStreamEvents';
import type { LabelUpdate, LabelType } from '@/lib/types';

const LABEL_META: Record<LabelType, { icon: string; title: string; color: string }> = {
  recent_follow:    { icon: '💜', title: 'Recent Follow',    color: '#9147ff' },
  latest_sub:       { icon: '⭐', title: 'Latest Sub',       color: '#f59e0b' },
  top_cheerer:      { icon: '💙', title: 'Top Cheerer',      color: '#3b82f6' },
  latest_donation:  { icon: '💚', title: 'Latest Donation',  color: '#10b981' },
  session_follows:  { icon: '📈', title: 'Session Follows',  color: '#8b5cf6' },
  session_subs:     { icon: '🏆', title: 'Session Subs',     color: '#d97706' },
};

const LABEL_ORDER: LabelType[] = [
  'recent_follow', 'latest_sub', 'top_cheerer',
  'latest_donation', 'session_follows', 'session_subs',
];

type LabelState = Partial<Record<LabelType, { value: string; animKey: number }>>;

export default function LabelsOverlay() {
  const [labels, setLabels] = useState<LabelState>({});

  useStreamEvents({
    label_update: (e: LabelUpdate) => {
      setLabels(prev => ({
        ...prev,
        [e.labelType]: {
          value: e.value,
          animKey: (prev[e.labelType]?.animKey ?? 0) + 1,
        },
      }));
    },
    // Auto-populate labels from alert events
    follow:   e => setLabels(p => ({ ...p, recent_follow:   { value: e.username,                 animKey: (p.recent_follow?.animKey ?? 0) + 1 } })),
    sub:      e => setLabels(p => ({ ...p, latest_sub:      { value: e.username,                 animKey: (p.latest_sub?.animKey ?? 0) + 1 } })),
    donation: e => setLabels(p => ({ ...p, latest_donation: { value: `$${e.amount.toFixed(2)} from ${e.username}`, animKey: (p.latest_donation?.animKey ?? 0) + 1 } })),
  });

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20,
      width: '220px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      pointerEvents: 'none',
    }}>
      {LABEL_ORDER.map(type => {
        const meta  = LABEL_META[type];
        const entry = labels[type];
        if (!entry) return null;

        return (
          <div key={type} style={{
            background: 'rgba(14,14,16,.85)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${meta.color}30`,
            borderLeft: `3px solid ${meta.color}`,
            borderRadius: '8px',
            padding: '8px 12px',
            animation: 'label-in .4s cubic-bezier(.34,1.56,.64,1) forwards',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b6b78', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>
              {meta.icon} {meta.title}
            </div>
            <div
              key={entry.animKey}
              style={{
                fontSize: '14px', fontWeight: 800,
                color: meta.color,
                textShadow: `0 0 10px ${meta.color}60`,
                lineHeight: 1.3,
                animation: 'label-in .4s cubic-bezier(.34,1.56,.64,1) forwards',
                wordBreak: 'break-word',
              }}
            >
              {entry.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
