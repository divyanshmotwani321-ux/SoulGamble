import React, { useState, useEffect, useRef } from 'react';
import {
  debugLogger,
  LogEntry,
  LogCategory,
  ToastNotification
} from '../lib/debugLogger.js';
import {
  Bug,
  X,
  Copy,
  Trash2,
  Pause,
  Play,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Activity,
  Globe,
  Layers,
  Search
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: FilterTab;
}

export type FilterTab = 'ALL' | 'ERRORS' | 'WARN' | 'NETWORK' | 'STATE';

export const RuntimeDebugDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTab = 'ALL'
}) => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to debug logger updates
  useEffect(() => {
    const unsubscribe = debugLogger.subscribe(logs => {
      setEntries(logs);
    });
    return unsubscribe;
  }, []);

  // Update activeTab if initialTab changes when opening
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Auto-scroll to bottom on new log entries if enabled
  useEffect(() => {
    if (autoScroll && isOpen && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [entries, autoScroll, isOpen]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const errorCount = entries.filter(
    e => e.level === 'ERROR' || e.category === 'ERROR' || e.category === 'API_ERR'
  ).length;
  const warnCount = entries.filter(e => e.level === 'WARN').length;
  const networkCount = entries.filter(
    e => e.category === 'NETWORK' || e.category === 'API_ERR'
  ).length;
  const stateCount = entries.filter(
    e => e.category === 'STATE' || e.category === 'FSM_MUTATION' || e.category === 'DECK_POINTER'
  ).length;

  const filteredEntries = entries.filter(entry => {
    // Tab filter
    if (activeTab === 'ERRORS') {
      if (entry.level !== 'ERROR' && entry.category !== 'ERROR' && entry.category !== 'API_ERR') {
        return false;
      }
    } else if (activeTab === 'WARN') {
      if (entry.level !== 'WARN') return false;
    } else if (activeTab === 'NETWORK') {
      if (entry.category !== 'NETWORK' && entry.category !== 'API_ERR') return false;
    } else if (activeTab === 'STATE') {
      if (
        entry.category !== 'STATE' &&
        entry.category !== 'FSM_MUTATION' &&
        entry.category !== 'DECK_POINTER'
      ) {
        return false;
      }
    }

    // Text search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = entry.message.toLowerCase().includes(q);
      const matchCat = entry.category.toLowerCase().includes(q);
      const matchDetail = entry.details
        ? JSON.stringify(entry.details).toLowerCase().includes(q)
        : false;
      const matchStack = entry.stack ? entry.stack.toLowerCase().includes(q) : false;
      return matchMsg || matchCat || matchDetail || matchStack;
    }

    return true;
  });

  const handleCopyLogs = () => {
    const formatted = filteredEntries.map(e => ({
      timestamp: e.timestamp,
      level: e.level,
      category: e.category,
      message: e.message,
      endpoint: e.endpoint,
      latencyMs: e.latencyMs,
      httpStatus: e.httpStatus,
      details: e.details,
      stack: e.stack
    }));

    navigator.clipboard.writeText(JSON.stringify(formatted, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadgeClass = (category: LogCategory, level: string) => {
    if (level === 'ERROR' || category === 'ERROR' || category === 'API_ERR') {
      return 'bg-rose-950/80 text-rose-300 border-rose-500/50';
    }
    if (level === 'WARN') {
      return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
    }
    if (category === 'NETWORK') {
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50';
    }
    if (category === 'DECK_POINTER') {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/60';
    }
    return 'bg-purple-950/80 text-purple-300 border-purple-500/50';
  };

  return (
    <aside
      aria-label="Runtime Debug Console"
      className="fixed inset-y-0 left-0 z-50 w-full max-w-xl sm:max-w-2xl bg-[#07030e]/95 text-slate-200 border-r-2 border-red-500/40 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col font-mono text-xs select-text animate-in slide-in-from-left duration-300"
    >
      {/* Drawer Terminal Top Bar */}
      <div className="p-3.5 border-b border-purple-900/60 bg-[#120822] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Terminal Window Dots */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <Bug size={16} className="text-amber-400" />
          <h2 className="font-bold text-amber-300 tracking-wider text-xs sm:text-sm uppercase font-serif-display">
            RUNTIME DEBUG CONSOLE
          </h2>
          <span className="text-[10px] text-purple-300/80 px-2 py-0.5 rounded bg-black/40 border border-purple-800">
            BUFFER: {entries.length}/100
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Close Console"
        >
          <X size={18} />
        </button>
      </div>

      {/* Filter Tabs & Quick Action Bar */}
      <div className="p-3 border-b border-purple-900/40 bg-black/40 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === 'ALL'
                  ? 'bg-purple-700 text-white shadow'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
            >
              <span>ALL</span>
              <span className="text-[10px] opacity-80">({entries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ERRORS')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === 'ERRORS'
                  ? 'bg-rose-700 text-white shadow'
                  : 'bg-slate-900/80 text-slate-400 hover:text-rose-300'
              }`}
            >
              <span>❌ ERRORS</span>
              <span
                className={`text-[10px] px-1 rounded-full ${
                  errorCount > 0 ? 'bg-rose-900 text-rose-200 font-bold' : 'opacity-80'
                }`}
              >
                {errorCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('WARN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === 'WARN'
                  ? 'bg-amber-600 text-black font-extrabold shadow'
                  : 'bg-slate-900/80 text-slate-400 hover:text-amber-300'
              }`}
            >
              <span>⚠️ WARN</span>
              <span className="text-[10px] opacity-80">({warnCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('NETWORK')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === 'NETWORK'
                  ? 'bg-cyan-700 text-white shadow'
                  : 'bg-slate-900/80 text-slate-400 hover:text-cyan-300'
              }`}
            >
              <span>🌐 NETWORK</span>
              <span className="text-[10px] opacity-80">({networkCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('STATE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === 'STATE'
                  ? 'bg-purple-900 text-purple-200 border border-purple-500 shadow'
                  : 'bg-slate-900/80 text-slate-400 hover:text-purple-300'
              }`}
            >
              <span>🔄 STATE</span>
              <span className="text-[10px] opacity-80">({stateCount})</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleCopyLogs}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-[11px]"
              title="Copy formatted logs to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Logs'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition ${
                autoScroll
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Toggle Auto-Scroll"
            >
              {autoScroll ? <Pause size={12} /> : <Play size={12} />}
              <span className="hidden sm:inline">{autoScroll ? 'Auto-Scroll' : 'Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => debugLogger.clear()}
              className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition"
              title="Clear Log Buffer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search logs, endpoints, stack traces, payloads..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/60 border border-purple-900/50 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Log Entries Container */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#07030e] scrollbar-thin scrollbar-thumb-purple-900"
      >
        {filteredEntries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Activity size={32} className="opacity-40" />
            <p className="text-xs">No runtime events captured under current filter.</p>
          </div>
        ) : (
          filteredEntries.map(entry => {
            const isExpanded = expandedIds.has(entry.id);
            const isError = entry.level === 'ERROR';

            return (
              <div
                key={entry.id}
                className={`rounded-xl border p-2.5 transition space-y-1.5 ${
                  isError
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                    : entry.level === 'WARN'
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                    : 'bg-black/60 border-purple-900/40 hover:border-purple-600/60'
                }`}
              >
                {/* Header: Timestamp, Level Badge, Category */}
                <div className="flex items-center justify-between text-[11px] gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-amber-400/90 font-bold">{entry.timestamp}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded border text-[9px] font-extrabold uppercase ${getCategoryBadgeClass(
                        entry.category,
                        entry.level
                      )}`}
                    >
                      [{entry.category}]
                    </span>
                    {entry.httpStatus && (
                      <span
                        className={`px-1 rounded text-[9px] font-bold ${
                          entry.httpStatus >= 400
                            ? 'bg-rose-900 text-rose-200'
                            : 'bg-emerald-900 text-emerald-200'
                        }`}
                      >
                        HTTP {entry.httpStatus}
                      </span>
                    )}
                    {entry.latencyMs !== undefined && (
                      <span className="text-[10px] text-slate-400">
                        ({entry.latencyMs}ms)
                      </span>
                    )}
                  </div>

                  {(entry.details || entry.stack) && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(entry.id)}
                      className="text-[10px] text-purple-300 hover:text-white flex items-center gap-0.5"
                    >
                      <span>{isExpanded ? 'Collapse' : 'Inspect'}</span>
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  )}
                </div>

                {/* Message */}
                <p
                  className={`text-xs break-words leading-relaxed ${
                    isError
                      ? 'text-rose-300 font-bold'
                      : entry.level === 'WARN'
                      ? 'text-amber-300'
                      : 'text-slate-200'
                  }`}
                >
                  {entry.message}
                </p>

                {/* Collapsible Inspector: Details, Payload & Stack Trace */}
                {isExpanded && (
                  <div className="pt-2 border-t border-purple-900/40 space-y-2 text-[11px]">
                    {entry.details && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-purple-300">
                          <span>PAYLOAD / DETAILS:</span>
                          <button
                            type="button"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                JSON.stringify(entry.details, null, 2)
                              )
                            }
                            className="text-slate-400 hover:text-white text-[9px] underline"
                          >
                            Copy JSON
                          </button>
                        </div>
                        <pre className="p-2 rounded bg-black/90 border border-purple-900/40 text-slate-300 overflow-x-auto max-h-48 whitespace-pre leading-relaxed text-[10px]">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {entry.stack && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-rose-400 font-bold">
                          <span>STACK TRACE:</span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(entry.stack!)}
                            className="text-slate-400 hover:text-white text-[9px] underline"
                          >
                            Copy Stack
                          </button>
                        </div>
                        <pre className="p-2 rounded bg-rose-950/40 border border-rose-900/50 text-rose-200 overflow-x-auto max-h-48 whitespace-pre leading-relaxed text-[10px]">
                          {entry.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

/**
 * OnScreenErrorToast: Floating banner triggered when runtime errors occur
 */
export const OnScreenErrorToast: React.FC<{
  onOpenDebug: () => void;
}> = ({ onOpenDebug }) => {
  const [toast, setToast] = useState<ToastNotification | null>(null);

  useEffect(() => {
    const unsubscribe = debugLogger.subscribeToast(newToast => {
      setToast(newToast);
      const timer = setTimeout(() => {
        setToast(current => (current?.id === newToast.id ? null : current));
      }, 7000);
      return () => clearTimeout(timer);
    });
    return unsubscribe;
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom duration-300">
      <div
        role="alert"
        onClick={onOpenDebug}
        className="w-full bg-gradient-to-r from-[#2a0614] via-[#1a040d] to-[#2a0614] border-2 border-rose-500/80 rounded-2xl p-3 sm:p-4 shadow-[0_0_35px_rgba(244,63,94,0.6)] cursor-pointer hover:brightness-110 transition flex items-center justify-between gap-3 text-slate-100 font-mono text-xs"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0 animate-pulse">
            <AlertTriangle size={18} />
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] font-bold text-rose-400 tracking-wider uppercase">
              ⚠️ Runtime Error Captured [{toast.category}]
            </div>
            <p className="text-xs text-rose-100 font-bold truncate mt-0.5">
              {toast.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-[10px] font-bold text-amber-300 underline">
            Inspect in Debug Logs &rarr;
          </span>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setToast(null);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
