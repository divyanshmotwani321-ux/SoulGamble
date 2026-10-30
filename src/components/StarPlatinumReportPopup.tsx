import React, { useEffect, useState } from 'react';
import { ActionReport } from '../server/gameEngine.js';

interface Props {
  report: ActionReport | null;
  onDismiss: () => void;
}

const TYPE_COLORS: Record<string, { border: string; glow: string; badge: string; badgeText: string }> = {
  CHEAT_BOTTOM: {
    border: 'border-rose-500',
    glow: 'shadow-[0_0_24px_rgba(244,63,94,0.75),4px_4px_0_#000]',
    badge: 'bg-rose-600',
    badgeText: '⚡ CHEAT CAUGHT!'
  },
  CHEAT_SECOND: {
    border: 'border-rose-500',
    glow: 'shadow-[0_0_24px_rgba(244,63,94,0.75),4px_4px_0_#000]',
    badge: 'bg-rose-600',
    badgeText: '⚡ CHEAT CAUGHT!'
  },
  TAMPER: {
    border: 'border-purple-400',
    glow: 'shadow-[0_0_24px_rgba(168,85,247,0.75),4px_4px_0_#000]',
    badge: 'bg-purple-600',
    badgeText: '★ DECK TAMPERED'
  },
  STUNT: {
    border: 'border-cyan-400',
    glow: 'shadow-[0_0_24px_rgba(34,211,238,0.65),4px_4px_0_#000]',
    badge: 'bg-cyan-700',
    badgeText: '💨 PHANTOM STUNT'
  },
  CLEAN: {
    border: 'border-emerald-400',
    glow: 'shadow-[0_0_18px_rgba(52,211,153,0.55),4px_4px_0_#000]',
    badge: 'bg-emerald-700',
    badgeText: '✓ SCAN COMPLETE'
  },
  MISS: {
    border: 'border-amber-500',
    glow: 'shadow-[0_0_14px_rgba(251,191,36,0.45),4px_4px_0_#000]',
    badge: 'bg-amber-700',
    badgeText: '✕ MISSED'
  },
  BLUFF: {
    border: 'border-amber-400',
    glow: 'shadow-[0_0_14px_rgba(251,191,36,0.45),4px_4px_0_#000]',
    badge: 'bg-amber-600',
    badgeText: '😏 BLUFF DEPLOYED'
  }
};

export const StarPlatinumReportPopup: React.FC<Props> = ({ report, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [autoDismissBar, setAutoDismissBar] = useState(100);

  useEffect(() => {
    if (!report) {
      setIsVisible(false);
      setAutoDismissBar(100);
      return;
    }

    // Animate in
    setIsVisible(true);
    setAutoDismissBar(100);

    // Auto-dismiss after 7 seconds
    const totalMs = 7000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, ((totalMs - elapsed) / totalMs) * 100);
      setAutoDismissBar(pct);
      if (elapsed >= totalMs) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [report]);

  if (!report || !isVisible) return null;

  const colors = TYPE_COLORS[report.type] || TYPE_COLORS.CLEAN;
  const isCritical = report.type === 'CHEAT_BOTTOM' || report.type === 'CHEAT_SECOND';

  return (
    <div
      className={`
        fixed bottom-28 right-3 sm:right-5 z-50 w-[320px] sm:w-[380px]
        bg-[#0b0718]/97 border-3 ${colors.border} ${colors.glow}
        rounded-2xl overflow-hidden select-none
        ${isCritical ? 'animate-[slideInRight_0.35s_ease-out]' : 'animate-[slideInRight_0.25s_ease-out]'}
      `}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      {/* Header strip with badge */}
      <div className={`flex items-center justify-between px-3 py-2 ${colors.badge} border-b-2 border-black`}>
        <div className="flex items-center gap-2">
          {/* Star Platinum Front Avatar (small) */}
          <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden shrink-0 shadow-[2px_2px_0_#000]">
            <img
              src="/assets/star-platinum-front.jpg"
              alt="Star Platinum"
              className="w-full h-full object-cover object-top scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/star-platinum.jpg';
              }}
            />
          </div>
          <span className="font-arcade text-[8px] text-white tracking-wider">
            {colors.badgeText}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="w-5 h-5 rounded bg-black/40 hover:bg-black/70 text-white text-[10px] font-black flex items-center justify-center transition border border-white/20"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Body: SP image + text */}
      <div className="flex gap-3 px-3 py-3 items-start">
        {/* Star Platinum tall portrait */}
        <div className={`shrink-0 w-14 h-20 rounded-xl border-2 ${colors.border} overflow-hidden shadow-[2px_2px_0_#000] bg-[#1a0a2e]`}>
          <img
            src="/assets/star-platinum-front.jpg"
            alt="Star Platinum"
            className="w-full h-full object-cover object-top"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/star-platinum.jpg';
            }}
          />
        </div>

        {/* Report text block */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <p className="font-arcade text-[8px] text-amber-300 tracking-wider leading-tight">
            {report.title}
          </p>
          <p className="font-vt323 text-[16px] text-slate-100 leading-[1.3]">
            {report.text}
          </p>
          {/* Auto-dismiss bar */}
          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10 mt-1">
            <div
              className={`h-full ${colors.badge} transition-all duration-75 rounded-full`}
              style={{ width: `${autoDismissBar}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

