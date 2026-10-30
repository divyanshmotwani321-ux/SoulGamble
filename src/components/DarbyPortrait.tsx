import React from 'react';
import { DarbyFSMState } from '../server/structures/DarbyBrain.js';
import { PortraitMood } from '../server/gameEngine.js';
import { Skull, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  fsmState: DarbyFSMState;
  paranoia: number;
  composure: number;
  dealer: 'DANIEL J. D\'ARBY' | 'DEALER BOY';
  mood: PortraitMood;
  bankChips?: number;
  streetBet?: number;
}

export const DarbyPortrait: React.FC<Props> = ({
  fsmState,
  paranoia,
  composure,
  dealer,
  mood,
  bankChips = 12,
  streetBet = 0
}) => {
  const isCatatonic = fsmState === 'CATATONIC' || mood === 'WHITE_HAIR' || composure <= 0;
  const isPanicked = !isCatatonic && (fsmState === 'PARANOID' || mood === 'PANICKED' || paranoia >= 55);
  const isSweating = !isCatatonic && (
    isPanicked || mood === 'SWEATING' || mood === 'SUSPICIOUS' || paranoia >= 35
  );
  const isSmug = !isCatatonic && !isPanicked;

  // Reactive Sprite CSS Class
  const spriteFxClass = isCatatonic
    ? 'darby-fx-catatonic'
    : isPanicked
    ? 'darby-fx-paranoid'
    : 'darby-fx-smug';

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* =========================================================
          D'ARBY 3D-SPACE SEATED SPRITE
          ========================================================= */}
      <div className="relative flex items-end justify-center">
        {/* Floating Menacing (ゴゴゴ) Particles when Paranoid */}
        {isPanicked && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
            <span
              className="absolute -left-6 top-8 text-2xl font-black text-purple-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] menace-kanji"
              style={{ animationDelay: '0s' }}
            >
              ゴ
            </span>
            <span
              className="absolute -left-10 top-24 text-3xl font-black text-purple-500 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] menace-kanji"
              style={{ animationDelay: '0.4s' }}
            >
              ゴ
            </span>
            <span
              className="absolute -right-6 top-10 text-2xl font-black text-purple-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] menace-kanji"
              style={{ animationDelay: '0.8s' }}
            >
              ゴ
            </span>
            <span
              className="absolute -right-12 top-28 text-3xl font-black text-purple-600 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] menace-kanji"
              style={{ animationDelay: '1.2s' }}
            >
              ゴ
            </span>
          </div>
        )}

        {/* Sweat Droplets falling when Sweating/Paranoid */}
        {isSweating && (
          <div className="absolute inset-x-0 top-6 h-32 pointer-events-none z-20 flex justify-around">
            <div className="w-2.5 h-4 bg-sky-400 rounded-full sweat-drop shadow-[0_0_8px_rgba(56,189,248,0.8)]" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-3.5 bg-cyan-300 rounded-full sweat-drop shadow-[0_0_8px_rgba(103,232,249,0.8)]" style={{ animationDelay: '0.5s', marginLeft: '30px' }} />
            <div className="w-2.5 h-4 bg-sky-400 rounded-full sweat-drop shadow-[0_0_8px_rgba(56,189,248,0.8)]" style={{ animationDelay: '0.9s', marginRight: '40px' }} />
          </div>
        )}

        {/* Catatonic White-Hair Shock Warning Pill */}
        {isCatatonic && (
          <div className="absolute -top-6 bg-white text-black font-arcade text-[9px] px-3 py-1 rounded border-2 border-black shadow-manga animate-bounce z-30">
            ★ MENTAL COLLAPSE ★
          </div>
        )}

        {/* Character Seated Asset Container */}
        <div className={`relative transition-all duration-300 ${spriteFxClass}`}>
          <img
            src="/assets/darby-seated.png"
            alt="Daniel J. D'Arby Seated at Table"
            className="w-48 sm:w-60 md:w-64 max-h-[290px] object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)]"
            onError={(e) => {
              // Try fallback to jpg if png failed
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith('.jpg')) {
                target.src = '/assets/darby-seated.jpg';
              }
            }}
          />

          {/* Catatonic Inverted Glow Overlay */}
          {isCatatonic && (
            <div className="absolute inset-0 bg-white/20 pointer-events-none mix-blend-overlay rounded-lg" />
          )}
        </div>
      </div>
    </div>
  );
};
