import React, { Component, ErrorInfo, ReactNode } from 'react';
import { debugLogger } from '../lib/debugLogger.js';
import { AlertOctagon, RotateCcw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  onOpenDebug?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    debugLogger.logError(`React Component Boundary Caught: ${error.message}`, {
      name: error.name,
      message: error.message,
      componentStack: errorInfo.componentStack
    }, error.stack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07020d] text-slate-200 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-gradient-to-b from-[#1b0826] to-[#0d0315] border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(244,63,94,0.4)] space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
                <AlertOctagon size={28} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-amber-300 font-serif-display tracking-wider">
                  STAND DISRUPTION: RUNTIME ERROR CAPTURED
                </h1>
                <p className="text-xs text-rose-300 font-mono mt-0.5">
                  Component hierarchy interrupted. Error logged to Debug Store.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/80 border border-rose-900/50 font-mono text-xs text-rose-200 space-y-2 overflow-x-auto">
              <div className="font-bold text-rose-400">
                {this.state.error?.name}: {this.state.error?.message}
              </div>
              {this.state.error?.stack && (
                <pre className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
              >
                <RotateCcw size={16} />
                <span>Restart Session</span>
              </button>
              {this.props.onOpenDebug && (
                <button
                  type="button"
                  onClick={this.props.onOpenDebug}
                  className="px-5 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-500 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition"
                >
                  <Bug size={16} />
                  <span>Inspect in Debug Console</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
