import React, { useState } from 'react';
import { SoulState, SoulOwner } from '../server/structures/SoulStructures.js';
import { X, Lock, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';

const portraitByOwner: Record<'JOTARO' | 'AVDOL' | 'KAKYOIN' | 'HOLLY', string> = {
  JOTARO: '/assets/jotaro-full.png',
  AVDOL: '/assets/avdol.jpg',
  KAKYOIN: '/assets/kakyoin.jpg',
  HOLLY: '/assets/holly.jpg'
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vaultEntries: SoulState[];
  jotaroActiveChips: number;
  activeWagerableChips: number;
  toCall: number;
  mustPledge: boolean;
  onPledge: (owner: SoulOwner, amount: number) => void;
}

export const SoulVaultModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vaultEntries,
  jotaroActiveChips,
  activeWagerableChips,
  toCall,
  mustPledge,
  onPledge
}) => {
  const [selectedOwner, setSelectedOwner] = useState<SoulOwner>('JOTARO');
  const [amount, setAmount] = useState<number>(1);

  if (!isOpen) return null;

  const selectedSoul = vaultEntries.find(e => e.owner === selectedOwner);
  const maxAvailable = selectedSoul ? selectedSoul.heldByPlayer : 0;

  const avdol = vaultEntries.find(e => e.owner === 'AVDOL');
  const kakyoin = vaultEntries.find(e => e.owner === 'KAKYOIN');
  const hollyUnlocked = Boolean(
    avdol &&
      kakyoin &&
      avdol.heldByPlayer === 0 &&
      avdol.heldByDarby === avdol.totalChips &&
      avdol.inPot === 0 &&
      kakyoin.heldByPlayer === 0 &&
      kakyoin.heldByDarby === kakyoin.totalChips &&
      kakyoin.inPot === 0 &&
      activeWagerableChips === 0
  );

  const checkGated = (owner: SoulOwner): { isGated: boolean; reason?: string } => {
    if (owner === 'JOTARO') return { isGated: false };
    if (owner === 'AVDOL' || owner === 'KAKYOIN') {
      const allowed = jotaroActiveChips <= 2 || toCall > jotaroActiveChips;
      if (!allowed) {
        return {
          isGated: true,
          reason: `Liquidity Gate: Locked while you have >2 active Jotaro chips (${jotaroActiveChips} left) unless facing a bet exceeding your chips.`
        };
      }
      return { isGated: false };
    }
    if (owner === 'HOLLY') {
      if (!hollyUnlocked) {
        return {
          isGated: true,
          reason: 'LAST RESORT — LOCKED (Only unlocks if Jotaro, Avdol & Kakyoin lose all chips)'
        };
      }
      return { isGated: false };
    }
    return { isGated: false };
  };

  const selectedGating = checkGated(selectedOwner);
  const canConfirm = !selectedGating.isGated && maxAvailable > 0 && amount > 0 && amount <= maxAvailable;

  const handleConfirm = () => {
    if (canConfirm) {
      onPledge(selectedOwner, amount);
      if (!mustPledge) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#110920] border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-purple-900/50 flex items-center justify-between bg-purple-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            <h3 className="text-lg font-bold text-amber-300 font-serif-display">
              Soul Vault • Collateral Pledge
            </h3>
          </div>
          {!mustPledge && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
          <div className="text-xs text-slate-300 leading-relaxed bg-purple-950/30 p-3 rounded-xl border border-purple-900/40">
            <strong>Last Resort:</strong> Holly stays locked until Jotaro, Avdol, and Kakyoin have lost every wagerable chip. Pledge companion souls when your personal chips are depleted or when matching a large bet.
          </div>

          {/* Soul Selector Cards */}
          <div className="grid grid-cols-2 gap-3">
            {(['JOTARO', 'AVDOL', 'KAKYOIN', 'HOLLY'] as SoulOwner[]).map(owner => {
              const soul = vaultEntries.find(e => e.owner === owner);
              if (!soul) return null;
              const isSelected = selectedOwner === owner;
              const isHolly = owner === 'HOLLY';
              const gating = checkGated(owner);
              const isDepleted = soul.heldByPlayer <= 0;

              return (
                <button
                  key={owner}
                  type="button"
                  onClick={() => {
                    setSelectedOwner(owner);
                    setAmount(1);
                  }}
                  className={`p-2 rounded-xl border text-left transition flex items-center gap-2 relative ${
                    isSelected
                      ? 'bg-purple-900/70 border-amber-400 shadow-lg shadow-amber-500/10'
                      : isDepleted || gating.isGated
                      ? 'bg-slate-900/30 border-purple-950/40 opacity-75'
                      : 'bg-black/40 border-purple-900/40 hover:border-purple-600'
                  }`}
                >
                  <img
                    src={portraitByOwner[owner as keyof typeof portraitByOwner]}
                    alt={soul.name}
                    className="w-14 h-14 shrink-0 rounded-lg border-2 border-amber-400/70 object-cover object-top shadow-md"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 w-full mb-1">
                      <span className="font-bold text-xs text-amber-300 truncate">{soul.name}</span>
                      {isHolly && hollyUnlocked ? (
                        <span className="text-[9px] leading-tight font-mono font-bold px-1.5 py-1 rounded bg-rose-950/90 text-amber-200 border border-amber-400/70 animate-pulse text-center shrink-0">
                          ⚠️ FINAL LIFELINE UNLOCKED — PLEDGE MOTHER&apos;S SOUL (+30% PARANOIA)
                        </span>
                      ) : isHolly ? (
                        <span className="text-[9px] leading-tight font-mono font-bold px-1.5 py-1 rounded bg-rose-950/90 text-amber-200 border border-rose-500/70 text-center shrink-0">
                          🔒 LAST RESORT — LOCKED (Only unlocks if Jotaro, Avdol &amp; Kakyoin lose all chips)
                        </span>
                      ) : gating.isGated ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-600/40 flex items-center gap-1 shrink-0">
                          <Lock size={10} /> GATED
                        </span>
                      ) : isDepleted ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                          0 left
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                          {soul.heldByPlayer} chips
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isHolly ? '1.6x Paranoia Multiplier' : soul.buffDescription.slice(0, 34) + '...'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Details for Selected Soul */}
          {selectedSoul && (
            <div className="p-4 rounded-xl bg-black/60 border border-purple-800/40 space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-serif-display">
                  {selectedSoul.name} Soul Details
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {selectedSoul.heldByPlayer} Chips In Reserve
                </span>
              </div>

              {selectedGating.isGated && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs font-mono">
                  <Lock size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span>{selectedGating.reason}</span>
                </div>
              )}
              {selectedOwner === 'HOLLY' && hollyUnlocked && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/70 border border-amber-400/70 text-amber-100 text-xs font-mono animate-pulse">
                  <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
                  <span>⚠️ FINAL LIFELINE UNLOCKED — PLEDGE MOTHER&apos;S SOUL (+30% PARANOIA)</span>
                </div>
              )}

              <div className="text-xs space-y-1.5">
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                  <strong>Buff:</strong> {selectedSoul.buffDescription}
                </div>
                <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300">
                  <strong>Penalty:</strong> {selectedSoul.penaltyDescription}
                </div>
              </div>

              {selectedOwner === 'HOLLY' && (
                <div className="flex items-center gap-2 p-2.5 rounded bg-rose-950/80 border border-rose-600 text-rose-200 text-xs">
                  <AlertTriangle size={18} className="text-rose-400 shrink-0 animate-pulse" />
                  <span>
                    <strong>SUDDEN DEATH TABOO:</strong> Losing even a single chip of Holly's soul triggers an INSTANT GAME OVER!
                  </span>
                </div>
              )}

              {/* Quantity Picker */}
              {!selectedGating.isGated && maxAvailable > 0 && (
                <div className="pt-2 flex items-center justify-between border-t border-purple-900/40">
                  <span className="text-xs text-slate-300 font-semibold">Chips to Pledge:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(Math.max(1, amount - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-amber-300 text-sm">{amount}</span>
                    <button
                      type="button"
                      onClick={() => setAmount(Math.min(maxAvailable, amount + 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-900/50 bg-purple-950/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={mustPledge}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {mustPledge ? 'Pledge Required' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {selectedGating.isGated
              ? 'Wager Locked'
              : `Pledge ${amount} Chip${amount > 1 ? 's' : ''} to Pot`}
          </button>
        </div>
      </div>
    </div>
  );
};
