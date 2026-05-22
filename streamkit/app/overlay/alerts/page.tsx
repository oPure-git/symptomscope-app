'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useStreamEvents } from '@/lib/useStreamEvents';
import type { StreamEvent, FollowEvent, SubEvent, RaidEvent, CheerEvent, DonationEvent } from '@/lib/types';

type AlertEvent = FollowEvent | SubEvent | RaidEvent | CheerEvent | DonationEvent;

interface AlertConfig {
  gradient: string;
  glow: string;
  badge: string;
  badgeBg: string;
  label: string;
  icon: string;
}

function getConfig(event: AlertEvent): AlertConfig {
  switch (event.type) {
    case 'follow':
      return { gradient: 'linear-gradient(135deg,#7c3aed,#9147ff,#a78bfa)', glow: 'rgba(145,71,255,.5)', badge: '#c4b5fd', badgeBg: 'rgba(109,40,217,.4)', label: 'NEW FOLLOWER', icon: '💜' };
    case 'sub':
      if (event.gifted)
        return { gradient: 'linear-gradient(135deg,#db2777,#ec4899,#f9a8d4)', glow: 'rgba(236,72,153,.5)', badge: '#fbcfe8', badgeBg: 'rgba(219,39,119,.4)', label: 'GIFTED SUB', icon: '🎁' };
      if (event.tier === '3000')
        return { gradient: 'linear-gradient(135deg,#ea580c,#f97316,#fdba74)', glow: 'rgba(249,115,22,.5)', badge: '#fed7aa', badgeBg: 'rgba(234,88,12,.4)', label: 'TIER 3 SUB', icon: '🔥' };
      if (event.tier === '2000')
        return { gradient: 'linear-gradient(135deg,#0891b2,#06b6d4,#67e8f9)', glow: 'rgba(6,182,212,.5)', badge: '#a5f3fc', badgeBg: 'rgba(8,145,178,.4)', label: 'TIER 2 SUB', icon: '💎' };
      return { gradient: 'linear-gradient(135deg,#d97706,#f59e0b,#fde68a)', glow: 'rgba(245,158,11,.5)', badge: '#fef3c7', badgeBg: 'rgba(217,119,6,.4)', label: 'NEW SUBSCRIBER', icon: '⭐' };
    case 'raid':
      return { gradient: 'linear-gradient(135deg,#dc2626,#ef4444,#fca5a5)', glow: 'rgba(239,68,68,.5)', badge: '#fecaca', badgeBg: 'rgba(220,38,38,.4)', label: 'INCOMING RAID', icon: '⚔️' };
    case 'cheer':
      return { gradient: 'linear-gradient(135deg,#2563eb,#3b82f6,#93c5fd)', glow: 'rgba(59,130,246,.5)', badge: '#bfdbfe', badgeBg: 'rgba(37,99,235,.4)', label: 'CHEER', icon: '💙' };
    case 'donation':
      return { gradient: 'linear-gradient(135deg,#059669,#10b981,#6ee7b7)', glow: 'rgba(16,185,129,.5)', badge: '#a7f3d0', badgeBg: 'rgba(5,150,105,.4)', label: 'DONATION', icon: '💚' };
  }
}

function getSubline(event: AlertEvent): string {
  switch (event.type) {
    case 'follow': return 'just followed!';
    case 'sub':
      if (event.gifted && event.giftedBy) return `gifted by ${event.giftedBy}`;
      if (event.months && event.months > 1) return `${event.months}-month streak!`;
      return 'just subscribed!';
    case 'raid': return `raiding with ${event.viewerCount.toLocaleString()} viewers!`;
    case 'cheer': return `cheered ${event.bits.toLocaleString()} bits!`;
    case 'donation': return `donated ${event.currency}${event.amount.toFixed(2)}!`;
  }
}

function getExtraMessage(event: AlertEvent): string | undefined {
  if ((event.type === 'sub' || event.type === 'cheer' || event.type === 'donation') && event.message)
    return event.message;
  return undefined;
}

const ALERT_DURATION = 6000;
const EXIT_DURATION  = 400;

export default function AlertsOverlay() {
  const [current, setCurrent] = useState<AlertEvent | null>(null);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const queueRef = useRef<AlertEvent[]>([]);
  const busyRef  = useRef(false);

  const next = useCallback(() => {
    if (queueRef.current.length === 0) { busyRef.current = false; setCurrent(null); return; }
    const ev = queueRef.current.shift()!;
    busyRef.current = true;
    setCurrent(ev);
    setPhase('in');
    setTimeout(() => setPhase('hold'), 550);
    setTimeout(() => setPhase('out'), ALERT_DURATION - EXIT_DURATION);
    setTimeout(() => next(), ALERT_DURATION);
  }, []);

  const enqueue = useCallback((ev: AlertEvent) => {
    queueRef.current.push(ev);
    if (!busyRef.current) next();
  }, [next]);

  useStreamEvents({
    follow:   e => enqueue(e),
    sub:      e => enqueue(e),
    raid:     e => enqueue(e),
    cheer:    e => enqueue(e),
    donation: e => enqueue(e),
  });

  if (!current) return null;

  const cfg = getConfig(current);
  const isOut = phase === 'out';
  const msg   = getExtraMessage(current);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      paddingBottom: '60px', pointerEvents: 'none',
    }}>
      <div style={{
        width: '420px',
        animation: isOut ? 'alert-out .35s ease-in forwards' : 'alert-in .55s cubic-bezier(.34,1.56,.64,1) forwards',
        filter: `drop-shadow(0 0 32px ${cfg.glow})`,
      }}>
        {/* Card */}
        <div style={{
          borderRadius: '16px',
          background: cfg.gradient,
          padding: '2px',
          boxShadow: `0 8px 40px ${cfg.glow}, 0 2px 8px rgba(0,0,0,.6)`,
        }}>
          <div style={{
            borderRadius: '14px',
            background: 'rgba(0,0,0,.55)',
            backdropFilter: 'blur(12px)',
            padding: '20px 24px',
          }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: cfg.badgeBg,
              borderRadius: '6px', padding: '4px 12px',
              fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px',
              color: cfg.badge, marginBottom: '12px',
              textShadow: '0 1px 4px rgba(0,0,0,.5)',
            }}>
              <span>{cfg.icon}</span>
              {cfg.label}
            </div>

            {/* Username */}
            <div style={{
              fontSize: '30px', fontWeight: 900,
              color: '#fff',
              textShadow: `0 0 20px ${cfg.glow}, 0 2px 4px rgba(0,0,0,.8)`,
              lineHeight: 1.15, marginBottom: '6px',
              letterSpacing: '-0.5px',
            }}>
              {current.username}
            </div>

            {/* Subline */}
            <div style={{
              fontSize: '16px', fontWeight: 600,
              color: cfg.badge,
              textShadow: '0 1px 4px rgba(0,0,0,.6)',
              marginBottom: msg ? '12px' : 0,
            }}>
              {getSubline(current)}
            </div>

            {/* Optional message */}
            {msg && (
              <div style={{
                borderTop: `1px solid ${cfg.badgeBg}`,
                paddingTop: '10px',
                fontSize: '14px',
                color: 'rgba(255,255,255,.85)',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}>
                &ldquo;{msg}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!isOut && (
          <div style={{ margin: '6px 8px 0', height: '3px', background: 'rgba(255,255,255,.12)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: cfg.gradient,
              animation: `shimmer ${ALERT_DURATION / 1000}s linear forwards`,
              backgroundSize: '200% 100%',
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
