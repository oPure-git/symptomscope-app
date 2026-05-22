'use client';
import { useState } from 'react';
import { useStreamEvents } from '@/lib/useStreamEvents';
import type { GoalUpdate } from '@/lib/types';

const DEFAULT: GoalUpdate = {
  id: 'default', timestamp: 0,
  type: 'goal_update', goalType: 'followers',
  current: 0, target: 1000, label: 'Follower Goal',
};

export default function GoalOverlay() {
  const [goal, setGoal] = useState<GoalUpdate>(DEFAULT);
  const [animKey, setAnimKey] = useState(0);

  useStreamEvents({
    goal_update: (e: GoalUpdate) => {
      setGoal(e);
      setAnimKey(k => k + 1);
    },
  });

  const pct     = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const reached = pct >= 100;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      width: '320px', pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(14,14,16,.88)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: '14px',
        padding: '16px 18px',
        boxShadow: reached
          ? '0 0 30px rgba(16,185,129,.4), 0 4px 20px rgba(0,0,0,.6)'
          : '0 4px 20px rgba(0,0,0,.6)',
        transition: 'box-shadow .6s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ fontSize: '16px' }}>{goal.goalType === 'subs' ? '⭐' : '💜'}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#adadb8', letterSpacing: '.5px', textTransform: 'uppercase' }}>
              {goal.label}
            </span>
          </div>
          {reached && (
            <span style={{
              fontSize: '11px', fontWeight: 800, letterSpacing: '1px',
              color: '#6ee7b7', background: 'rgba(16,185,129,.2)',
              padding: '2px 8px', borderRadius: '4px',
              animation: 'live-pulse 1.2s ease-in-out infinite',
            }}>
              GOAL REACHED! 🎉
            </span>
          )}
        </div>

        {/* Numbers */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
          <span style={{
            fontSize: '28px', fontWeight: 900,
            color: reached ? '#6ee7b7' : '#efeff1',
            transition: 'color .4s ease',
            textShadow: reached ? '0 0 16px rgba(16,185,129,.5)' : undefined,
          }}>
            {goal.current.toLocaleString()}
          </span>
          <span style={{ fontSize: '16px', color: '#6b6b78', fontWeight: 600 }}>
            / {goal.target.toLocaleString()}
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: '15px', fontWeight: 800,
            color: reached ? '#6ee7b7' : '#9147ff',
            transition: 'color .4s ease',
          }}>
            {pct}%
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: '10px', background: 'rgba(255,255,255,.08)',
          borderRadius: '99px', overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,.4)',
        }}>
          <div
            key={animKey}
            style={{
              height: '100%', width: `${pct}%`,
              borderRadius: '99px',
              background: reached
                ? 'linear-gradient(90deg,#059669,#10b981,#6ee7b7)'
                : 'linear-gradient(90deg,#7c3aed,#9147ff,#a78bfa)',
              boxShadow: reached
                ? '0 0 12px rgba(16,185,129,.6)'
                : '0 0 12px rgba(145,71,255,.6)',
              transition: 'background .6s ease, box-shadow .6s ease',
              animation: 'shimmer 2.5s linear infinite',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
