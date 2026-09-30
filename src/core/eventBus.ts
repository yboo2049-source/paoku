type EventCallback = (data?: any) => void;

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    this.listeners.set(
      event,
      callbacks.filter((cb) => cb !== callback)
    );
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks && callbacks.length > 0) {
      [...callbacks].forEach((cb) => cb(data));
    }
  }
}

export const eventBus = new EventBus();
