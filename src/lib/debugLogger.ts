export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type LogCategory =
  | 'ERROR'
  | 'WARN'
  | 'API_ERR'
  | 'NETWORK'
  | 'FSM_MUTATION'
  | 'DECK_POINTER'
  | 'STATE';

export interface LogEntry {
  id: string;
  timestamp: string; // HH:mm:ss.SSS
  rawTime: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  stack?: string;
  endpoint?: string;
  httpStatus?: number;
  latencyMs?: number;
}

export interface ToastNotification {
  id: string;
  message: string;
  category: LogCategory;
  timestamp: number;
}

type LogListener = (entries: LogEntry[]) => void;
type ToastListener = (toast: ToastNotification) => void;

class DebugLoggerStore {
  private readonly capacity = 100;
  private entries: LogEntry[] = [];
  private logListeners: Set<LogListener> = new Set();
  private toastListeners: Set<ToastListener> = new Set();
  private counter = 0;
  private interceptorsInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initGlobalInterceptors();
    }
  }

  public getEntries(): LogEntry[] {
    return [...this.entries];
  }

  public getErrorCount(): number {
    return this.entries.filter(e => e.level === 'ERROR').length;
  }

  public subscribe(listener: LogListener): () => void {
    this.logListeners.add(listener);
    listener(this.getEntries());
    return () => {
      this.logListeners.delete(listener);
    };
  }

  public subscribeToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getEntries();
    this.logListeners.forEach(listener => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error in debug log subscriber:', err);
      }
    });
  }

  private notifyToast(message: string, category: LogCategory): void {
    const toast: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      category,
      timestamp: Date.now()
    };
    this.toastListeners.forEach(listener => {
      try {
        listener(toast);
      } catch (err) {
        console.error('Error in toast subscriber:', err);
      }
    });
  }

  public addEntry(entry: {
    level: LogLevel;
    category: LogCategory;
    message: string;
    details?: any;
    stack?: string;
    endpoint?: string;
    httpStatus?: number;
    latencyMs?: number;
  }): LogEntry {
    const now = new Date();
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;

    const newEntry: LogEntry = {
      id: `log-${++this.counter}-${Date.now()}`,
      timestamp,
      rawTime: now.getTime(),
      ...entry
    };

    if (this.entries.length >= this.capacity) {
      this.entries.shift(); // Maintain bounded circular buffer of capacity 100
    }
    this.entries.push(newEntry);

    // Trigger toast for urgent errors and network failures
    if (newEntry.level === 'ERROR') {
      this.notifyToast(newEntry.message, newEntry.category);
    }

    this.notify();
    return newEntry;
  }

  public log(level: LogLevel, category: LogCategory, message: string, details?: any): LogEntry {
    return this.addEntry({ level, category, message, details });
  }

  public logError(message: string, details?: any, stack?: string): LogEntry {
    return this.addEntry({
      level: 'ERROR',
      category: 'ERROR',
      message,
      details,
      stack: stack || (details instanceof Error ? details.stack : undefined)
    });
  }

  public logWarn(message: string, details?: any): LogEntry {
    return this.addEntry({
      level: 'WARN',
      category: 'WARN',
      message,
      details
    });
  }

  public logStateTransition(
    action: string,
    prevState: any,
    nextState: any,
    meta?: any
  ): LogEntry {
    const changes: Record<string, { prev: any; next: any }> = {};

    if (prevState && nextState) {
      if (prevState.phase !== nextState.phase) {
        changes.phase = { prev: prevState.phase, next: nextState.phase };
      }
      if (prevState.starPlatinumCharges !== nextState.starPlatinumCharges) {
        changes.spCharges = {
          prev: prevState.starPlatinumCharges,
          next: nextState.starPlatinumCharges
        };
      }
      const prevPot = prevState.dsTelemetry?.soulPot?.stackSize;
      const nextPot = nextState.dsTelemetry?.soulPot?.stackSize;
      if (prevPot !== undefined && nextPot !== undefined && prevPot !== nextPot) {
        changes.potTotal = { prev: prevPot, next: nextPot };
      }
      const prevParanoia = prevState.dsTelemetry?.darbyBrain?.metrics?.paranoia;
      const nextParanoia = nextState.dsTelemetry?.darbyBrain?.metrics?.paranoia;
      if (prevParanoia !== undefined && nextParanoia !== undefined && prevParanoia !== nextParanoia) {
        changes.darbyParanoia = { prev: `${prevParanoia}%`, next: `${nextParanoia}%` };
      }
      const prevComposure = prevState.dsTelemetry?.darbyBrain?.metrics?.composure;
      const nextComposure = nextState.dsTelemetry?.darbyBrain?.metrics?.composure;
      if (prevComposure !== undefined && nextComposure !== undefined && prevComposure !== nextComposure) {
        changes.darbyComposure = { prev: `${prevComposure}%`, next: `${nextComposure}%` };
      }
      const prevFsm = prevState.dsTelemetry?.darbyBrain?.currentState;
      const nextFsm = nextState.dsTelemetry?.darbyBrain?.currentState;
      if (prevFsm !== undefined && nextFsm !== undefined && prevFsm !== nextFsm) {
        changes.darbyFSM = { prev: prevFsm, next: nextFsm };
      }
    }

    const descParts: string[] = [];
    if (changes.phase) descParts.push(`Phase: ${changes.phase.prev} ➔ ${changes.phase.next}`);
    if (changes.spCharges) descParts.push(`SP: ${changes.spCharges.prev} ➔ ${changes.spCharges.next}`);
    if (changes.potTotal) descParts.push(`Pot: ${changes.potTotal.prev} ➔ ${changes.potTotal.next}`);
    if (changes.darbyFSM) descParts.push(`FSM: ${changes.darbyFSM.prev} ➔ ${changes.darbyFSM.next}`);

    const summary = descParts.length > 0
      ? `Action [${action}]: ${descParts.join(' | ')}`
      : `Action [${action}] dispatched`;

    return this.addEntry({
      level: 'INFO',
      category: 'STATE',
      message: summary,
      details: {
        action,
        changes,
        meta,
        prevPhase: prevState?.phase,
        nextPhase: nextState?.phase
      }
    });
  }

  public logDeckPointer(message: string, details?: any): LogEntry {
    return this.addEntry({
      level: 'INFO',
      category: 'DECK_POINTER',
      message,
      details
    });
  }

  public clear(): void {
    this.entries = [];
    this.notify();
  }

  public initGlobalInterceptors(): void {
    if (typeof window === 'undefined' || this.interceptorsInitialized) return;
    this.interceptorsInitialized = true;

    // 1. Intercept window.onerror for uncaught exceptions
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const msgStr = typeof message === 'string' ? message : 'Unknown script error';
      this.addEntry({
        level: 'ERROR',
        category: 'ERROR',
        message: `Uncaught Error: ${msgStr}`,
        details: { source, lineno, colno },
        stack: error?.stack
      });
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    // 2. Intercept unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason?.message || (typeof reason === 'string' ? reason : 'Unhandled Promise Rejection');
      this.addEntry({
        level: 'ERROR',
        category: 'ERROR',
        message: `Unhandled Rejection: ${msg}`,
        details: reason,
        stack: reason?.stack
      });
    });

    // 3. Intercept console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      try {
        const errorObj = args.find(a => a instanceof Error);
        const msg = args
          .map(a => (typeof a === 'string' ? a : (a?.message || JSON.stringify(a))))
          .join(' ');
        this.addEntry({
          level: 'ERROR',
          category: 'ERROR',
          message: msg || 'Console error occurred',
          details: { args },
          stack: errorObj?.stack
        });
      } catch {
        // Guard against recursive circular error logging
      }
    };

    // 4. Intercept console.warn
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      originalConsoleWarn.apply(console, args);
      try {
        const msg = args
          .map(a => (typeof a === 'string' ? a : (a?.message || JSON.stringify(a))))
          .join(' ');
        this.addEntry({
          level: 'WARN',
          category: 'WARN',
          message: msg || 'Console warning',
          details: { args }
        });
      } catch {
        // Guard against recursive circular warning logging
      }
    };

    // 5. Intercept window.fetch for real-time round-trip latency & payload tracking
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || 'unknown';
      const options = (args[1] || {}) as RequestInit;
      const method = (options.method || 'GET').toUpperCase();
      let requestPayload: any = null;

      if (options.body && typeof options.body === 'string') {
        try {
          requestPayload = JSON.parse(options.body);
        } catch {
          requestPayload = options.body;
        }
      }

      const startTime = performance.now();
      try {
        const response = await originalFetch.apply(window, args);
        const latencyMs = Math.round(performance.now() - startTime);

        // Clone response to inspect body without consuming client stream
        let responsePayload: any = null;
        try {
          const clone = response.clone();
          responsePayload = await clone.json();
        } catch {
          // not json or body empty
        }

        const isErrorStatus = !response.ok || (responsePayload && responsePayload.success === false);

        if (isErrorStatus) {
          const errMsg = responsePayload?.error || `HTTP ${response.status} ${response.statusText}`;
          this.addEntry({
            level: 'ERROR',
            category: 'API_ERR',
            message: `API Failed [${method} ${url}]: ${errMsg} (${latencyMs}ms)`,
            details: {
              request: { method, url, payload: requestPayload },
              response: { status: response.status, payload: responsePayload },
              latencyMs
            },
            endpoint: url,
            httpStatus: response.status,
            latencyMs
          });
        } else {
          this.addEntry({
            level: 'INFO',
            category: 'NETWORK',
            message: `API [${method} ${url}] -> ${response.status} OK (${latencyMs}ms)`,
            details: {
              request: { method, url, payload: requestPayload },
              response: { status: response.status, payload: responsePayload },
              latencyMs
            },
            endpoint: url,
            httpStatus: response.status,
            latencyMs
          });
        }

        return response;
      } catch (err: any) {
        const latencyMs = Math.round(performance.now() - startTime);
        this.addEntry({
          level: 'ERROR',
          category: 'API_ERR',
          message: `Network Exception [${method} ${url}]: ${err.message} (${latencyMs}ms)`,
          details: {
            request: { method, url, payload: requestPayload },
            error: err.message,
            latencyMs
          },
          stack: err.stack,
          endpoint: url,
          latencyMs
        });
        throw err;
      }
    };
  }
}

export const debugLogger = new DebugLoggerStore();
