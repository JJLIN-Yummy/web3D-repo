export type EventMap = Record<string, any>;

// 回调直接接收 payload?: any
export type EventCallback = (payload?: any) => void;

export class EventEmitterLite<T extends EventMap> {
  #events = new Map<keyof T, Set<EventCallback>>();

  on<K extends keyof T>(eventName: K, cb: EventCallback) {
    if (!this.#events.has(eventName)) {
      this.#events.set(eventName, new Set());
    }
    this.#events.get(eventName)!.add(cb);
    // 返回取消监听函数
    return () => this.#events.get(eventName)!.delete(cb);
  }

  emit<K extends keyof T>(eventName: K, payload?: any) {
    const callbacks = this.#events.get(eventName);
    if (!callbacks) return;

    callbacks.forEach((cb) => cb(payload));
  }
}
