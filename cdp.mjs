// Local Chromium DevTools Protocol client; Node 22+ built-ins only.
export class CDP {
  constructor(ws) {
    this.ws = ws;
    this.sequence = 0;
    this.pending = new Map();
    ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
    ws.addEventListener('close', () => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(new Error('Discord debugging connection closed'));
      }
      this.pending.clear();
    });
  }
  static async connect() {
    const response = await fetch('http://127.0.0.1:19227/json/list', {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) throw new Error('Discord debugging endpoint unavailable');
    const pages = await response.json();
    const page = pages.find(p => p.type === 'page' && new URL(p.url).origin === 'https://discord.com');
    if (!page) throw new Error('Discord is not logged in or its window is closed');
    const url = new URL(page.webSocketDebuggerUrl);
    if (url.protocol !== 'ws:' || url.hostname !== '127.0.0.1' || url.port !== '19227') {
      throw new Error('Refusing a non-local debugging target');
    }
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { ws.close(); reject(new Error('Discord connection timeout')); }, 2000);
      ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Discord connection failed')); }, { once: true });
    });
    return new CDP(ws);
  }
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out`)); }, 4000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error('Discord UI automation failed');
    return result.result.value;
  }
  close() { this.ws.close(); }
}
