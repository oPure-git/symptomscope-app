'use client';
import { useEffect, useRef } from 'react';
import type { StreamEvent } from './types';

const ALL_TYPES = [
  'connected',
  'follow',
  'sub',
  'raid',
  'cheer',
  'donation',
  'chat',
  'goal_update',
  'label_update',
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerMap = Partial<Record<(typeof ALL_TYPES)[number], (data: any) => void>>;

export function useStreamEvents(handlers: HandlerMap) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    let es: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource('/api/events');

      ALL_TYPES.forEach(type => {
        es!.addEventListener(type, (e: MessageEvent) => {
          const h = ref.current[type];
          if (h) {
            try { h(JSON.parse(e.data)); } catch {}
          }
        });
      });

      es.onerror = () => {
        es?.close();
        timer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => { es?.close(); clearTimeout(timer); };
  }, []);
}
