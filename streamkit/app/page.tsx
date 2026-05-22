'use client';
import { useState, useCallback, useRef } from 'react';
import { useStreamEvents } from '@/lib/useStreamEvents';
import type { StreamEvent } from '@/lib/types';

// ── Overlay cards ─────────────────────────────────────────────
const OVERLAYS = [
  {
    id: 'alerts', title: 'Alert Overlay', icon: '🔔',
    desc: 'Follows, subs, raids, cheers & donations',
    gradient: 'linear-gradient(135deg,#7c3aed,#9147ff)',
    glow: 'rgba(145,71,255,.35)',
    path: '/overlay/alerts',
  },
  {
    id: 'chat', title: 'Chat Overlay', icon: '💬',
    desc: 'Live chat bubbles for your stream',
    gradient: 'linear-gradient(135deg,#0891b2,#3b82f6)',
    glow: 'rgba(59,130,246,.35)',
    path: '/overlay/chat',
  },
  {
    id: 'goal', title: 'Goal Widget', icon: '🎯',
    desc: 'Follower & subscriber progress bar',
    gradient: 'linear-gradient(135deg,#d97706,#f59e0b)',
    glow: 'rgba(245,158,11,.35)',
    path: '/overlay/goal',
  },
  {
    id: 'labels', title: 'Stream Labels', icon: '🏷️',
    desc: 'Recent follower, latest sub & more',
    gradient: 'linear-gradient(135deg,#059669,#10b981)',
    glow: 'rgba(16,185,129,.35)',
    path: '/overlay/labels',
  },
];

// ── Test event presets ────────────────────────────────────────
function mkTest(label: string, icon: string, bg: string, payload: Partial<StreamEvent>) {
  return { label, icon, bg, payload };
}

const TESTS = [
  mkTest('Follow',     '💜', 'linear-gradient(135deg,#7c3aed,#9147ff)', { type: 'follow',   username: 'pogchamp_fan99' }),
  mkTest('Sub T1',     '⭐', 'linear-gradient(135deg,#d97706,#f59e0b)', { type: 'sub',       username: 'SilverSub', tier: '1000', months: 1 }),
  mkTest('Sub T2',     '💎', 'linear-gradient(135deg,#0891b2,#06b6d4)', { type: 'sub',       username: 'CyberUser', tier: '2000', months: 3 }),
  mkTest('Sub T3',     '🔥', 'linear-gradient(135deg,#ea580c,#f97316)', { type: 'sub',       username: 'LegendSub', tier: '3000', months: 12 }),
  mkTest('Gifted Sub', '🎁', 'linear-gradient(135deg,#db2777,#ec4899)', { type: 'sub',       username: 'LuckyViewer', tier: '1000', gifted: true, giftedBy: 'GiftKing' }),
  mkTest('Raid',       '⚔️', 'linear-gradient(135deg,#dc2626,#ef4444)', { type: 'raid',      username: 'RaidBoss420', viewerCount: 247 }),
  mkTest('Cheer',      '💙', 'linear-gradient(135deg,#2563eb,#3b82f6)', { type: 'cheer',     username: 'BitDropper', bits: 1000, message: 'PogChamp this stream is amazing!' }),
  mkTest('Donation',   '💚', 'linear-gradient(135deg,#059669,#10b981)', { type: 'donation',  username: 'GenViewer', amount: 5.00, currency: '$', message: 'Keep up the great content!' }),
  mkTest('Chat',       '💬', 'linear-gradient(135deg,#4f46e5,#6366f1)', { type: 'chat',      username: 'ChatUser', color: '#9147ff', message: 'This overlay is so clean! PogChamp', badges: [{ type: 'sub', label: 'Sub', color: '#9147ff' }] }),
  mkTest('Goal +50',   '📈', 'linear-gradient(135deg,#7c3aed,#8b5cf6)', { type: 'goal_update', goalType: 'followers', current: 750, target: 1000, label: 'Follower Goal' }),
  mkTest('Goal Done',  '🏆', 'linear-gradient(135deg,#059669,#10b981)', { type: 'goal_update', goalType: 'followers', current: 1000, target: 1000, label: 'Follower Goal' }),
];

// ── Badge type colors ─────────────────────────────────────────
const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  follow:      { bg: 'rgba(145,71,255,.2)',  color: '#c4b5fd', label: 'follow'    },
  sub:         { bg: 'rgba(245,158,11,.2)',  color: '#fde68a', label: 'sub'       },
  raid:        { bg: 'rgba(239,68,68,.2)',   color: '#fca5a5', label: 'raid'      },
  cheer:       { bg: 'rgba(59,130,246,.2)',  color: '#bfdbfe', label: 'cheer'     },
  donation:    { bg: 'rgba(16,185,129,.2)',  color: '#6ee7b7', label: 'donation'  },
  chat:        { bg: 'rgba(99,102,241,.2)',  color: '#c7d2fe', label: 'chat'      },
  goal_update: { bg: 'rgba(139,92,246,.2)', color: '#ddd6fe', label: 'goal'      },
  label_update:{ bg: 'rgba(52,211,153,.2)', color: '#a7f3d0', label: 'label'     },
};

interface LogEntry {
  id: string;
  type: string;
  summary: string;
  time: string;
}

function summarize(e: Partial<StreamEvent> & { type: string }): string {
  if (e.type === 'follow')      return `${(e as {username:string}).username} followed`;
  if (e.type === 'sub')         return `${(e as {username:string}).username} subscribed (T${((e as {tier?:string}).tier || '1000').slice(0,1)})`;
  if (e.type === 'raid')        return `${(e as {username:string}).username} raided with ${(e as {viewerCount?:number}).viewerCount} viewers`;
  if (e.type === 'cheer')       return `${(e as {username:string}).username} cheered ${(e as {bits?:number}).bits} bits`;
  if (e.type === 'donation')    return `${(e as {username:string}).username} donated ${ (e as {currency?:string,amount?:number}).currency}${(e as {amount?:number}).amount?.toFixed(2)}`;
  if (e.type === 'chat')        return `${(e as {username:string}).username}: ${(e as {message?:string}).message?.slice(0,40)}`;
  if (e.type === 'goal_update') return `Goal: ${(e as {current?:number}).current}/${(e as {target?:number}).target}`;
  return e.type;
}

// ── Component ─────────────────────────────────────────────────
export default function Dashboard() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [firing, setFiring] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useStreamEvents({
    connected: () => setConnected(true),
    follow:      e => addLog(e),
    sub:         e => addLog(e),
    raid:        e => addLog(e),
    cheer:       e => addLog(e),
    donation:    e => addLog(e),
    chat:        e => addLog(e),
    goal_update: e => addLog(e),
    label_update:e => addLog(e),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addLog(e: any) {
    const entry: LogEntry = {
      id: e.id || Math.random().toString(36).slice(2),
      type: e.type,
      summary: summarize(e),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setLog(prev => [entry, ...prev].slice(0, 80));
  }

  const fire = useCallback(async (test: typeof TESTS[0]) => {
    setFiring(test.label);
    try {
      await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.payload),
      });
    } finally {
      setTimeout(() => setFiring(null), 400);
    }
  }, []);

  const copy = useCallback((path: string, id: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          height: '60px', display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'linear-gradient(135deg,#7c3aed,#9147ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', boxShadow: '0 0 16px rgba(145,71,255,.4)',
          }}>⚡</div>

          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-.3px' }}>
              Stream<span style={{ color: '#9147ff' }}>Kit</span>
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--text-dim)', marginTop: '-1px' }}>
              Stream Overlay Toolkit
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '6px',
              background: connected ? 'rgba(16,185,129,.12)' : 'rgba(107,107,120,.12)',
              border: `1px solid ${connected ? 'rgba(16,185,129,.3)' : 'var(--border)'}`,
              fontSize: '.78rem', fontWeight: 700,
              color: connected ? '#6ee7b7' : 'var(--text-dim)',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: connected ? '#10b981' : 'var(--text-dim)',
                animation: connected ? 'live-pulse 1.5s ease-in-out infinite' : undefined,
                display: 'inline-block',
              }} />
              {connected ? 'Connected' : 'Connecting…'}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* ── Overlay URLs ── */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '.68rem', fontWeight: 800, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '14px' }}>
            Browser Source URLs
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' }}>
            {OVERLAYS.map(ov => (
              <div key={ov.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                overflow: 'hidden',
                transition: 'border-color .2s, box-shadow .2s',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#9147ff';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px #9147ff, 0 4px 24px ${ov.glow}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                {/* Gradient strip */}
                <div style={{ height: '4px', background: ov.gradient }} />

                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '9px',
                      background: ov.gradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', boxShadow: `0 0 12px ${ov.glow}`,
                      flexShrink: 0,
                    }}>
                      {ov.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '.93rem', fontWeight: 700 }}>{ov.title}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>{ov.desc}</div>
                    </div>
                  </div>

                  {/* URL display */}
                  <div style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: '7px',
                    padding: '7px 10px',
                    fontSize: '.75rem',
                    color: 'var(--text-dim)',
                    fontFamily: 'monospace',
                    marginBottom: '10px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    localhost:3000{ov.path}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => copy(ov.path, ov.id)}
                      style={{
                        flex: 1, padding: '7px 0',
                        borderRadius: '7px',
                        border: 'none',
                        background: copied === ov.id ? 'rgba(16,185,129,.15)' : 'var(--surface3)',
                        color: copied === ov.id ? '#6ee7b7' : 'var(--text-muted)',
                        fontSize: '.78rem', fontWeight: 700,
                        cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                      }}
                    >
                      {copied === ov.id ? '✓ Copied!' : 'Copy URL'}
                    </button>
                    <a
                      href={ov.path}
                      target="_blank"
                      rel="noopener"
                      style={{
                        flex: 1, padding: '7px 0',
                        borderRadius: '7px',
                        background: 'var(--surface3)',
                        color: 'var(--text-muted)',
                        fontSize: '.78rem', fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .15s',
                      }}
                    >
                      Preview ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Test Events + Log ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>

          {/* Test Events */}
          <section>
            <h2 style={{ fontSize: '.68rem', fontWeight: 800, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '14px' }}>
              Fire Test Events
            </h2>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '18px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '10px' }}>
                {TESTS.map(t => (
                  <button
                    key={t.label}
                    onClick={() => fire(t)}
                    disabled={firing === t.label}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '9px',
                      border: 'none',
                      background: firing === t.label ? 'rgba(255,255,255,.08)' : 'var(--surface2)',
                      color: firing === t.label ? 'var(--text-dim)' : 'var(--text)',
                      fontSize: '.82rem',
                      fontWeight: 700,
                      cursor: firing === t.label ? 'not-allowed' : 'pointer',
                      transition: 'all .15s',
                      display: 'flex', alignItems: 'center', gap: '7px',
                      fontFamily: 'inherit',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      if (firing !== t.label) {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.background = t.bg;
                        el.style.color = 'white';
                        el.style.boxShadow = '0 4px 16px rgba(0,0,0,.3)';
                        el.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = 'var(--surface2)';
                      el.style.color = 'var(--text)';
                      el.style.boxShadow = 'none';
                      el.style.transform = 'none';
                    }}
                  >
                    <span style={{ fontSize: '15px' }}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{
                marginTop: '16px', paddingTop: '14px',
                borderTop: '1px solid var(--border)',
                fontSize: '.78rem', color: 'var(--text-dim)',
                lineHeight: 1.6,
              }}>
                Click any button to fire a test event — it will appear in all connected overlay pages and the event log in real time.
              </div>
            </div>
          </section>

          {/* Event Log */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '.68rem', fontWeight: 800, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Event Log
              </h2>
              {log.length > 0 && (
                <button
                  onClick={() => setLog([])}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-dim)', cursor: 'pointer',
                    fontSize: '.72rem', fontWeight: 600,
                    fontFamily: 'inherit',
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <div
              ref={logRef}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                height: '420px',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {log.length === 0 ? (
                <div style={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-dim)', gap: '10px', fontSize: '.85rem',
                }}>
                  <span style={{ fontSize: '28px', opacity: .3 }}>📋</span>
                  No events yet — fire a test above
                </div>
              ) : (
                log.map(entry => {
                  const style = TYPE_STYLE[entry.type] || { bg: 'rgba(107,107,120,.15)', color: 'var(--text-dim)', label: entry.type };
                  return (
                    <div key={entry.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      transition: 'background .1s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '.65rem', color: 'var(--text-dim)', fontFamily: 'monospace', flexShrink: 0 }}>
                        {entry.time}
                      </span>
                      <span style={{
                        fontSize: '.65rem', fontWeight: 700, letterSpacing: '.5px',
                        padding: '1px 6px', borderRadius: '4px',
                        background: style.bg, color: style.color,
                        flexShrink: 0,
                      }}>
                        {style.label.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '.82rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.summary}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* ── OBS Setup Guide ── */}
        <section style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '.68rem', fontWeight: 800, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '14px' }}>
            OBS Setup
          </h2>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '20px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px',
          }}>
            {[
              { step: '1', title: 'Add Browser Source', desc: 'In OBS, click + in the Sources panel and choose Browser.' },
              { step: '2', title: 'Paste the URL',       desc: 'Copy the overlay URL above and paste it into the URL field.' },
              { step: '3', title: 'Set 1920×1080',        desc: 'Match your canvas size so overlays position correctly.' },
              { step: '4', title: 'Enable Transparency',  desc: 'Check "Allow transparency" to get a transparent background.' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '7px',
                  background: 'var(--primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.8rem', fontWeight: 900, flexShrink: 0,
                }}>
                  {item.step}
                </div>
                <div>
                  <div style={{ fontSize: '.88rem', fontWeight: 700, marginBottom: '3px' }}>{item.title}</div>
                  <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
