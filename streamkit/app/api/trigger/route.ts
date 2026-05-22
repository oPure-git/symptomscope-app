import { eventBus } from '@/lib/events';
import type { StreamEvent } from '@/lib/types';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = { ...body, id: randomUUID(), timestamp: Date.now() } as StreamEvent;
    eventBus.emit(event);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
}
