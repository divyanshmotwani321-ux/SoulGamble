import React from 'react';
import { Card } from '../server/structures/RiggedDeckDeque.js';

interface Props {
  card: Card;
  isSelected?: boolean;
  isWinningCard?: boolean;
  onClick?: () => void;
  canSelect?: boolean;
  label?: string;
  isOpponent?: boolean;
  isDealing?: boolean;
  dealIndex?: number;
  flipped?: boolean;
  faceDown?: boolean;
}

export const CardView: React.FC<Props> = ({
  card,
  isSelected,
  isWinningCard,
  onClick,
  canSelect,
  label,
  isOpponent = false,
  isDealing = false,
  dealIndex = 0,
  flipped = false,
  faceDown = false
}) => {
  const isHidden = card.suit === 'HIDDEN' || card.rank === '?' || faceDown;

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'SPADES': return '♠';
      case 'HEARTS': return '♥';
      case 'DIAMONDS': return '♦';
      case 'CLUBS': return '♣';
      default: return '★';
    }
  };

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';

  // For 3D Showdown Card Flip:
  // If opponent's card is revealed (not HIDDEN) or explicitly flipped, show face side
  const shouldShowFace = !isHidden || flipped;

  // Staggered deal animation delay
  const animDelayStyle = isDealing ? { animationDelay: `${dealIndex * 0.08}s` } : {};

  // =========================================================
  // D'ARBY'S PERSPECTIVE CARDS (Opponent, Far Edge of Felt)
  // Supports 180-degree Y-axis 3D card flip at Showdown
  // =========================================================
  if (isOpponent) {
    return (
      <div
        className={`relative w-16 h-24 sm:w-20 sm:h-28 md:w-22 md:h-30 select-none card-3d-wrapper ${
          isDealing ? 'card-anim-deal-darby' : 'card-on-felt'
        }`}
        style={animDelayStyle}
      >
        <div
          className={`w-full h-full card-flipper-3d ${
            shouldShowFace ? 'card-flipped-3d' : ''
          }`}
        >
          {/* Card Back: Osiris Emblem (Visible when Face-Down) */}
          <div className="card-face-front w-full h-full rounded-xl border-2 border-black bg-gradient-to-br from-[#1b0d30] via-[#2d184f] to-[#0f071a] shadow-manga p-1 flex flex-col items-center justify-center">
            <div className="w-full h-full rounded-lg border border-amber-500/40 bg-[#120722]/80 flex flex-col items-center justify-center p-1">
              <span className="text-amber-400 text-lg sm:text-2xl font-serif-display drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                ★
              </span>
              <span className="font-arcade text-[7px] sm:text-[8px] text-purple-300 mt-0.5 tracking-wider">
                OSIRIS
              </span>
            </div>
          </div>

          {/* Card Face: Revealed Card at Showdown (Rotated 180 Y) */}
          <div
            className={`card-face-back w-full h-full rounded-xl border-2 border-black p-2 flex flex-col justify-between shadow-manga bg-gradient-to-br from-amber-50 to-amber-100 ${
              isWinningCard ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)]' : ''
            }`}
          >
            {/* Top Left Rank & Suit */}
            <div className={`leading-none ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
              <div className="font-bold text-xs sm:text-sm font-arcade">{card.rank}</div>
              <div className="text-xs">{getSuitSymbol(card.suit)}</div>
            </div>

            {/* Center Suit Symbol */}
            <div className={`text-center text-xl sm:text-2xl ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
              {getSuitSymbol(card.suit)}
            </div>

            {/* Bottom Right Rank & Suit (Inverted) */}
            <div className={`leading-none text-right rotate-180 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
              <div className="font-bold text-xs sm:text-sm font-arcade">{card.rank}</div>
              <div className="text-xs">{getSuitSymbol(card.suit)}</div>
            </div>
          </div>
        </div>

        {/* Winning Indicator */}
        {isWinningCard && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-arcade text-[7px] px-1.5 py-0.5 rounded border border-black shadow-manga whitespace-nowrap z-30">
            WINNER
          </span>
        )}

        {label && (
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-purple-300 bg-black/90 px-1 rounded whitespace-nowrap">
            {label}
          </span>
        )}
      </div>
    );
  }

  // =========================================================
  // JOTARO'S PERSPECTIVE CARDS (Player, Near Edge of Felt)
  // Lying flat on 3D felt; hovering tilts up toward camera!
  // =========================================================
  const cardTransformClass = isSelected
    ? 'card-selected-tilt'
    : canSelect
    ? 'card-hover-tilt card-on-felt cursor-pointer'
    : 'card-hover-tilt card-on-felt';

  // Blind hand display
  if (isHidden) {
    return (
      <div
        onClick={canSelect ? onClick : undefined}
        className={`relative w-18 h-26 sm:w-22 sm:h-32 md:w-24 md:h-36 rounded-xl border-3 border-black p-1 select-none shadow-manga card-3d-wrapper ${cardTransformClass} ${
          isDealing ? 'card-anim-deal-player' : ''
        } bg-gradient-to-br from-[#1a0f2e] via-[#2d1b4d] to-[#0f071c]`}
        style={animDelayStyle}
      >
        <div className="w-full h-full rounded-lg border-2 border-purple-500/50 flex flex-col items-center justify-center p-2 bg-[#120722]/90">
          <span className="text-amber-400 text-2xl sm:text-3xl font-serif-display drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]">
            ★
          </span>
          <span className="font-arcade text-[8px] sm:text-[9px] text-amber-300 mt-1 tracking-wider">
            BLIND HAND
          </span>
          <span className="text-[8px] font-mono text-purple-400 mt-0.5">
            [1.5x PARANOIA]
          </span>
        </div>

        {label && (
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-400 bg-black/90 px-1 rounded whitespace-nowrap">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={canSelect ? onClick : undefined}
      className={`relative w-18 h-26 sm:w-22 sm:h-32 md:w-24 md:h-36 rounded-xl border-3 border-black select-none shadow-manga p-2.5 flex flex-col justify-between card-3d-wrapper ${cardTransformClass} ${
        isDealing ? 'card-anim-deal-player' : ''
      } ${
        isWinningCard
          ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.9)] bg-gradient-to-br from-yellow-50 to-amber-100'
          : isSelected
          ? 'ring-4 ring-rose-500 bg-gradient-to-br from-rose-50 to-amber-50'
          : 'bg-gradient-to-br from-slate-50 via-amber-50/40 to-slate-100'
      }`}
      style={animDelayStyle}
    >
      {/* Top Left Rank & Suit */}
      <div className={`leading-none ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
        <div className="font-bold text-sm sm:text-base font-arcade">{card.rank}</div>
        <div className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Center Large Suit Icon */}
      <div className={`text-center text-2xl sm:text-4xl ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
        {getSuitSymbol(card.suit)}
      </div>

      {/* Bottom Right Rank & Suit (Inverted) */}
      <div className={`leading-none text-right rotate-180 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
        <div className="font-bold text-sm sm:text-base font-arcade">{card.rank}</div>
        <div className="text-xs sm:text-sm">{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Discard Selection Pill */}
      {isSelected && (
        <span className="absolute -top-3 -right-2 bg-rose-600 text-white font-arcade text-[8px] px-2 py-0.5 rounded border border-black shadow-manga animate-bounce z-40">
          DISCARD
        </span>
      )}

      {/* Winning Card Pill */}
      {isWinningCard && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black font-arcade text-[8px] px-2 py-0.5 rounded border border-black shadow-manga whitespace-nowrap z-40">
          ★ WINNER ★
        </span>
      )}

      {label && !isSelected && (
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-purple-200 bg-black/90 px-1.5 py-0.2 rounded border border-purple-900 whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
};
