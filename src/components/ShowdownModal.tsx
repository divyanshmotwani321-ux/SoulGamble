import React from 'react';
import { Card } from '../server/structures/RiggedDeckDeque.js';
import { EvaluatedHand } from '../server/structures/PokerHandEvaluator.js';
import { SanitizedGameState } from '../server/gameEngine.js';
import { CardView } from './CardView.js';
import { Sparkles, Trophy, ArrowRight, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  jotaroHand: Card[];
  darbyHand: Card[];
  showdownResult: SanitizedGameState['showdownResult'];
  potSize: number;
  onNextHand: () => void;
}

function checkIsWinningCard(
  card: Card,
  evalHand: EvaluatedHand | null | undefined,
  isWinner: boolean
): boolean {
  if (!isWinner || !evalHand) return false;

  const cat = evalHand.category;
  if (
    cat === 'ROYAL_FLUSH' ||
    cat === 'STRAIGHT_FLUSH' ||
    cat === 'FLUSH' ||
    cat === 'STRAIGHT'
  ) {
    return true; // All cards contributed to straight / flush
  }

  if (
    cat === 'FOUR_OF_A_KIND' ||
    cat === 'THREE_OF_A_KIND' ||
    cat === 'ONE_PAIR' ||
    cat === 'HIGH_CARD'
  ) {
    return card.value === evalHand.primaryRankValue;
  }

  if (cat === 'FULL_HOUSE' || cat === 'TWO_PAIR') {
    return (
      card.value === evalHand.primaryRankValue ||
      card.value === evalHand.secondaryRankValue
    );
  }

  return false;
}

export const ShowdownModal: React.FC<Props> = ({
  isOpen,
  jotaroHand,
  darbyHand,
  showdownResult,
  potSize,
  onNextHand
}) => {
  if (!isOpen || !showdownResult) return null;

  const isPlayerWinner = showdownResult.winner === 'PLAYER';
  const isDarbyWinner = showdownResult.winner === 'DARBY';
  const isPush = showdownResult.winner === 'PUSH';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-[#140822] border-4 border-black shadow-manga-lg rounded-2xl p-6 sm:p-8 space-y-6 my-auto">
        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-black border-2 border-amber-400 text-amber-300 font-arcade text-[10px] uppercase tracking-widest shadow-manga">
            <Sparkles size={14} className="text-amber-400 animate-spin" />
            SHOWDOWN — VERDICT OF OSIRIS
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-amber-300 font-arcade tracking-wider leading-relaxed">
            {isPlayerWinner
              ? '★ JOTARO KUJO CLAIMS THE SOUL POT! ★'
              : isDarbyWinner
              ? '☠ DANIEL J. D\'ARBY CLAIMS THE SOUL POT! ☠'
              : '★ STALEMATE: SPLIT POT! ★'}
          </h2>
        </div>

        {/* Winner Announcement Banner */}
        <div
          className={`p-4 rounded-xl border-3 border-black text-center shadow-manga transition-all ${
            isPlayerWinner
              ? 'bg-emerald-950 text-emerald-200'
              : isDarbyWinner
              ? 'bg-rose-950 text-rose-200'
              : 'bg-purple-950 text-purple-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2 font-arcade text-xs sm:text-sm">
            {isPlayerWinner ? (
              <Trophy size={18} className="text-emerald-400" />
            ) : isDarbyWinner ? (
              <ShieldAlert size={18} className="text-rose-400" />
            ) : (
              <Sparkles size={18} className="text-purple-400" />
            )}
            <span>{showdownResult.message}</span>
          </div>
        </div>

        {/* Hands Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Jotaro's Hand Zone */}
          <div
            className={`p-4 rounded-xl border-3 border-black shadow-manga space-y-3 ${
              isPlayerWinner ? 'bg-emerald-950/40 ring-2 ring-emerald-500' : 'bg-black/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-arcade text-xs text-amber-300">
                1P: JOTARO KUJO
              </span>
              <span className="font-arcade text-[9px] px-2 py-0.5 rounded bg-black border border-purple-800 text-purple-200">
                {showdownResult.playerHandEval?.description || 'Evaluated'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1">
              {jotaroHand.map((c, idx) => (
                <CardView
                  key={c.id || idx}
                  card={c}
                  isWinningCard={checkIsWinningCard(
                    c,
                    showdownResult.playerHandEval,
                    isPlayerWinner
                  )}
                  label={`Card #${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* D'Arby's Hand Zone */}
          <div
            className={`p-4 rounded-xl border-3 border-black shadow-manga space-y-3 ${
              isDarbyWinner ? 'bg-rose-950/40 ring-2 ring-rose-500' : 'bg-black/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-arcade text-xs text-amber-300">
                2P: DANIEL J. D'ARBY
              </span>
              <span className="font-arcade text-[9px] px-2 py-0.5 rounded bg-black border border-purple-800 text-purple-200">
                {showdownResult.darbyHandEval?.description || 'Evaluated'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1">
              {darbyHand.map((c, idx) => (
                <CardView
                  key={c.id || idx}
                  card={c}
                  isWinningCard={checkIsWinningCard(
                    c,
                    showdownResult.darbyHandEval,
                    isDarbyWinner
                  )}
                  label={`D'Arby #${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Soul Pot Transfer Bar */}
        <div className="bg-black border-3 border-black rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-manga">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 soul-coin-3d flex items-center justify-center font-black text-slate-950 text-sm">
              ★
            </div>
            <div>
              <div className="font-arcade text-[9px] text-purple-300 uppercase">
                SOUL POT TRANSFER:
              </div>
              <div className="font-vt323 text-lg text-amber-300">
                {isPlayerWinner
                  ? `Jotaro Kujo collects ${potSize} soul chips into his bank!`
                  : isDarbyWinner
                  ? `D'Arby secures ${potSize} soul chips for the Osiris Vault!`
                  : `Pot split equally between players (${potSize} chips).`}
              </div>
            </div>
          </div>

          <div className="font-arcade text-[10px] px-3 py-1.5 rounded bg-purple-950 border border-black text-amber-300 flex items-center gap-2">
            <span>POT: {potSize}</span>
            <ArrowRight size={13} className="text-amber-400" />
            <span>{isPlayerWinner ? 'JOTARO' : isDarbyWinner ? 'OSIRIS' : 'SPLIT'}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onNextHand}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-arcade text-xs uppercase tracking-widest border-3 border-black shadow-manga transition"
          >
            [DEAL NEXT HAND &rarr;]
          </button>
          <span className="font-mono text-[10px] text-slate-400">
            (Click [DEAL NEXT HAND] to proceed with match)
          </span>
        </div>
      </div>
    </div>
  );
};
