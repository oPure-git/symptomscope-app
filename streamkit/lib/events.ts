import type { StreamEvent } from './types';

type Listener = (event: StreamEvent) => void;

class EventBus {
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event: StreamEvent): void {
    this.listeners.forEach(fn => fn(event));
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __streamkitBus: EventBus | undefined;
}

if (!globalThis.__streamkitBus) {
  globalThis.__streamkitBus = new EventBus();
}

export const eventBus = globalThis.__streamkitBus!;
