import React, { useEffect } from 'react';
import { AvdolAdvice } from '../server/gameEngine.js';
import { Flame, X, TrendingUp, Eye, Sparkles, ShieldCheck } from 'lucide-react';
import { sounds } from '../utils/soundEffects.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  advice: AvdolAdvice | null;
  fsmState?: string;
  paranoia?: number;
  composure?: number;
}

export const AvdolAdviserModal: React.FC<Props> = ({
  isOpen,
  onClose,
  advice,
  fsmState,
  paranoia,
  composure
}) => {
  useEffect(() => {
    if (isOpen) {
      sounds.playAccusation();
    }
  }, [isOpen]);

  if (!isOpen || !advice) return null;

  const getRecommendationBadge = (rec: AvdolAdvice['recommendation']) => {
    switch (rec) {
      case 'RAISE':
        return {
          bg: 'bg-emerald-950 border-2 border-emerald-400 text-emerald-300 shadow-manga',
          title: 'DIRECTIVE: AGGRESSIVE RAISE',
          desc: "D'Arby shows critical mental fracture or bluff vulnerability. Punish him with a chip raise."
        };
      case 'CALL':
        return {
          bg: 'bg-indigo-950 border-2 border-indigo-400 text-indigo-300 shadow-manga',
          title: 'DIRECTIVE: CALL HIS BET',
          desc: "High probability D'Arby is bluffing or holding a modest hand. Match his bet to see his cards."
        };
      case 'CHECK':
        return {
          bg: 'bg-amber-950 border-2 border-amber-400 text-amber-300 shadow-manga',
          title: 'DIRECTIVE: CHECK & OBSERVE',
          desc: "Maintain pot control. Force D'Arby to act first without exposing excess soul chips."
        };
      case 'FOLD':
        return {
          bg: 'bg-rose-950 border-2 border-rose-500 text-rose-300 shadow-manga',
          title: 'DIRECTIVE: FOLD HAND',
          desc: "D'Arby likely holds a made pat hand or trips. Conserve your soul chips for the next street."
        };
    }
  };

  const recBadge = getRecommendationBadge(advice.recommendation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-start bg-black/80 backdrop-blur-md p-4 sm:p-8 overflow-y-auto">
      {/* Retro 90s RPG Advisor Frame sliding in from the left */}
      <div className="relative w-full max-w-3xl bg-[#14081c] border-4 border-black shadow-manga-lg rounded-2xl p-5 sm:p-6 text-slate-100 space-y-5 animate-in slide-in-from-left duration-300 my-auto">
        {/* Top Gold & Crimson Bezel */}
        <div className="flex items-center justify-between border-b-3 border-black pb-3">
          <div className="flex items-center gap-2">
            <span className="font-arcade text-[10px] px-2 py-0.5 rounded bg-amber-500 text-black border border-black shadow-[1px_1px_0_#000]">
              TACTICAL ADVISOR
            </span>
            <span className="font-arcade text-xs sm:text-sm text-amber-300 tracking-wider">
              MUHAMMAD AVDOL
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black hover:bg-rose-950 border-2 border-black text-slate-300 hover:text-white transition shadow-manga"
            title="Close Advisor"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Layout: Left RPG Portrait + Right Tactical Readout */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
          {/* Left Column: Avdol's Manga / RPG Portrait */}
          <div className="sm:col-span-5 flex flex-col items-center gap-3">
            <div className="relative w-44 h-56 sm:w-52 sm:h-64 rounded-xl border-4 border-black shadow-manga-lg overflow-hidden bg-black ring-2 ring-amber-500/70">
              <img
                src="/assets/avdol.jpg"
                alt="Muhammad Avdol Advisor"
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              {/* Stand Name Banner at bottom of portrait */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/90 to-transparent p-2 text-center">
                <span className="font-arcade text-[9px] text-amber-300 tracking-wider flex items-center justify-center gap-1">
                  <Flame size={12} className="text-rose-500 animate-pulse" />
                  MAGICIAN'S RED
                </span>
              </div>
            </div>

            {/* Soul Chip Status */}
            <div className="w-full py-1.5 px-2.5 rounded-lg bg-black border-2 border-emerald-500/60 flex items-center justify-center gap-1.5 text-emerald-300 font-mono text-[11px] shadow-manga">
              <ShieldCheck size={14} />
              <span>Avdol Soul: <strong>SAFE (6 CHIPS)</strong></span>
            </div>
          </div>

          {/* Right Column: Discard Tells, Bluff Probability, & Avdol Quote */}
          <div className="sm:col-span-7 space-y-4">
            {/* Tell Read & Bluff Probability */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Discard Tell */}
              <div className="p-3 bg-black/70 border-2 border-purple-900 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-arcade text-[10px] text-amber-300 uppercase">
                  <Eye size={13} className="text-amber-400" />
                  <span>Poker Discard Tell</span>
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  D'Arby Discarded: <strong className="text-amber-400 font-bold">{advice.darbyDiscardCount} Cards</strong>
                </div>
                <div className="text-xs text-purple-200 font-mono">
                  Estimated Hand: <strong>{advice.estimatedDarbyHand}</strong>
                </div>
              </div>

              {/* Bluff Probability Gauge */}
              <div className="p-3 bg-black/70 border-2 border-purple-900 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between font-arcade text-[10px]">
                  <span className="text-amber-300 flex items-center gap-1">
                    <TrendingUp size={13} /> BLUFF PROBABILITY
                  </span>
                  <span className="text-rose-400 font-vt323 text-lg font-bold">
                    {advice.bluffProbability}%
                  </span>
                </div>
                <div className="h-3 arcade-gauge-bezel rounded p-0.5">
                  <div
                    className={`h-full rounded-sm transition-all duration-300 ${
                      advice.bluffProbability >= 45
                        ? 'bg-gradient-to-r from-amber-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                        : 'bg-gradient-to-r from-emerald-500 to-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, advice.bluffProbability)}%` }}
                  />
                  <div className="absolute inset-0 arcade-gauge-segments" />
                </div>
              </div>
            </div>

            {/* Tactical Directive Badge */}
            <div className={`p-3 rounded-xl ${recBadge.bg}`}>
              <div className="font-arcade text-[10px] tracking-wider mb-0.5">
                {recBadge.title}
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                {recBadge.desc}
              </p>
            </div>

            {/* Retro RPG Dialogue Box */}
            <div className="p-3.5 bg-black border-3 border-amber-500 rounded-xl space-y-1 shadow-manga relative">
              <div className="font-arcade text-[9px] text-amber-400 tracking-widest uppercase">
                AVDOL'S COUNSEL:
              </div>
              <p className="font-vt323 text-base sm:text-lg text-amber-100 leading-snug">
                "{advice.adviceText}"
              </p>
              {/* Blinking prompt cursor */}
              <div className="absolute bottom-2 right-3 font-arcade text-amber-400 text-xs animate-bounce">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-arcade text-[11px] uppercase tracking-widest border-2 border-black shadow-manga transition"
          >
            [RETURN TO POKER TABLE]
          </button>
        </div>
      </div>
    </div>
  );
};
