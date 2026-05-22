import { eventBus } from '@/lib/events';
import type { StreamEvent } from '@/lib/types';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    start(ctrl) {
      const send = (type: string, data: unknown) => {
        try {
          ctrl.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      send('connected', { time: Date.now() });

      const unsub = eventBus.subscribe((event: StreamEvent) => send(event.type, event));

      req.signal.addEventListener('abort', () => {
        unsub();
        try { ctrl.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
