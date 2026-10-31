import React from 'react';
import { DarbyFSMState } from '../server/structures/DarbyBrain.js';
import { SoulOwner } from '../server/structures/SoulStructures.js';
import { Skull, AlertTriangle, Shield, Coins } from 'lucide-react';

interface Props {
  fsmState: DarbyFSMState;
  paranoia: number;
  composure: number;
  bankChips: number;
  streetBet: number;
  polnareffChips: number;
  josephChips: number;
  capturedChips: Array<{ owner: SoulOwner; count: number }>;
  isBluffing?: boolean;
}

export const DarbyArcadeHUD: React.FC<Props> = ({
  fsmState,
  paranoia,
  composure,
  bankChips,
  streetBet,
  polnareffChips,
  josephChips,
  capturedChips,
  isBluffing = false
}) => {
  const isHighDanger = paranoia >= 70 || composure <= 30;
  const isCatatonic = fsmState === 'CATATONIC' || composure <= 0;
  const capturedChipCount = capturedChips.reduce((total, chipGroup) => total + chipGroup.count, 0);

  const getFsmColor = (state: DarbyFSMState) => {
    switch (state) {
      case 'SMUG': return 'bg-amber-500 text-black';
      case 'CALCULATING': return 'bg-yellow-400 text-black';
      case 'GREEDY': return 'bg-emerald-500 text-black';
      case 'SUSPICIOUS': return 'bg-purple-600 text-white';
      case 'PARANOID': return 'bg-rose-600 text-white animate-pulse';
      case 'CATATONIC': return 'bg-white text-black animate-bounce';
      default: return 'bg-slate-700 text-white';
    }
  };

  return (
    <div className="darby-hud w-full sm:w-80 md:w-88 bg-[#0e071c]/95 border-3 border-black shadow-manga rounded-xl p-3 space-y-2.5 backdrop-blur-md">
      {/* Top Banner: Fighter Tag & FSM State */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-black/80 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-arcade text-[9px] px-1.5 py-0.5 rounded bg-rose-700 text-white border border-black shadow-[1px_1px_0_#000]">
            2P
          </span>
          <span className="font-arcade text-[10px] sm:text-[11px] text-amber-300 tracking-wider">
            D'ARBY
          </span>
        </div>
        <div className={`font-arcade text-[8px] sm:text-[9px] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_#000] font-bold ${getFsmColor(fsmState)}`}>
          {isCatatonic ? '☠ RETIRED ☠' : `FSM: ${fsmState}`}
        </div>
      </div>

      {/* D'Arby Active Bluff Tell Alert */}
      {isBluffing && (
        <div className="bg-rose-600 border border-black px-2 py-1 rounded text-center font-arcade text-[8px] text-white shadow-[1px_1px_0_#000] animate-pulse flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>★ EYE-TWITCH TELL: SUSPICIOUS BLUFF! ★</span>
        </div>
      )}

      {/* Arcade Health Bar: COMPOSURE */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] font-arcade">
          <span className="text-emerald-400 tracking-wider flex items-center gap-1">
            <Shield size={11} /> COMPOSURE
          </span>
          <span className="text-emerald-300 font-vt323 text-base font-bold">
            {composure}%
          </span>
        </div>
        <div className="h-4 arcade-gauge-bezel rounded-sm p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-green-300 rounded-sm transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            style={{ width: `${Math.max(0, Math.min(100, composure))}%` }}
          />
          <div className="absolute inset-0 arcade-gauge-segments" />
        </div>
      </div>

      {/* Arcade Danger Bar: PARANOIA */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] font-arcade">
          <span className="text-rose-400 tracking-wider flex items-center gap-1">
            {isHighDanger ? (
              <Skull size={11} className="text-rose-500 animate-bounce" />
            ) : (
              <AlertTriangle size={11} />
            )}
            PARANOIA
          </span>
          <span className="text-rose-300 font-vt323 text-base font-bold">
            {paranoia}%
          </span>
        </div>
        <div className="h-4 arcade-gauge-bezel rounded-sm p-0.5">
          <div
            className={`h-full rounded-sm transition-all duration-300 ${paranoia >= 60
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
              : 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
              }`}
            style={{ width: `${Math.max(0, Math.min(100, paranoia))}%` }}
          />
          <div className="absolute inset-0 arcade-gauge-segments" />
        </div>
      </div>

      {/* D'Arby Bank & Street Bet Pills */}
      <div className="grid grid-cols-2 gap-1.5 pt-0.5 font-arcade text-[8px]">
        <div className="bg-black/80 border border-purple-900/60 p-1.5 rounded flex items-center justify-between text-purple-200">
          <span className="text-purple-400">BANK:</span>
          <span className="text-amber-300 font-bold">{bankChips} CHIPS</span>
        </div>
        <div className="bg-black/80 border border-purple-900/60 p-1.5 rounded flex items-center justify-between text-purple-200">
          <span className="text-purple-400">STREET:</span>
          <span className="text-amber-300 font-bold">{streetBet} CHIPS</span>
        </div>
      </div>

      {/* D'Arby's Soul Chip Inventory — Circular Anime Chips */}
      <div className="pt-0.5 border-t-2 border-black/60">
        <div className="font-arcade text-[7px] text-purple-400 tracking-wider mb-1.5">
          D'ARBY'S SOUL CHIPS:
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {Array.from({ length: josephChips }).map((_, i) => (
                    <div
                      key={`joseph-${i}`}
                      className="soul-chip-darby"
                      style={{ zIndex: i }}
                    >
                      <img
                        src="/assets/joseph-chip.jpg"
                        alt="Joseph Soul Chip"
                        draggable={false}
                      />
                    </div>
              ))}
            </div>
            <span className="font-arcade text-[7px] text-rose-300">
              ×{josephChips}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {Array.from({ length: polnareffChips }).map((_, i) => (
                    <div
                      key={`polnareff-${i}`}
                      className="soul-chip-darby"
                      style={{ zIndex: i }}
                    >
                      <img
                        src="/assets/polnareff-chip.jpg"
                        alt="Polnareff Soul Chip"
                        draggable={false}
                      />
                    </div>
              ))}
            </div>
            <span className="font-arcade text-[7px] text-blue-300">
              ×{polnareffChips}
            </span>
          </div>
        </div>
        {capturedChipCount > 0 && (
          <div className="mt-2 border-t border-purple-900/60 pt-1.5">
            <div className="font-arcade text-[7px] text-amber-300 tracking-wider mb-1">
              CAPTURED JOTARO / CRUSADER CHIPS ×{capturedChipCount}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {capturedChips.map(({ owner, count }) => (
                <div
                  key={owner}
                  className="flex items-center gap-1.5"
                  aria-label={`${owner} captured chips: ${count}`}
                  title={`${owner} captured chips`}
                >
                  <div className="flex -space-x-2">
                    {Array.from({ length: count }).map((_, i) => (
                      <div
                        key={`${owner}-${i}`}
                        className={`soul-chip-jotaro soul-chip-${owner.toLowerCase()}`}
                        style={{ zIndex: i }}
                        aria-hidden="true"
                      >
                        ★
                      </div>
                    ))}
                  </div>
                  <span className="font-arcade text-[7px] text-amber-200">
                    ×{count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
