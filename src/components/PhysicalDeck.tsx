import React from 'react';

interface Props {
  remainingCards: number;
  isDealing?: boolean;
}

export const PhysicalDeck: React.FC<Props> = ({ remainingCards, isDealing = false }) => {
  return (
    <div className="relative flex flex-col items-center select-none card-3d-wrapper z-20">
      {/* 3D Stack of Physical Playing Cards */}
      <div
        className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-black bg-gradient-to-br from-[#1e0d36] via-[#2c144e] to-[#120622] p-1 shadow-manga"
        style={{
          boxShadow: `
            0 1px 0 #581c87,
            0 2px 0 #581c87,
            0 3px 0 #3b0764,
            0 4px 0 #3b0764,
            0 5px 0 #2e0854,
            0 6px 0 #1e0538,
            0 8px 16px rgba(0,0,0,0.85)
          `
        }}
      >
        {/* Card Back Face: Osiris Emblem */}
        <div className="w-full h-full rounded-lg border border-amber-400/60 bg-[#140824]/90 flex flex-col items-center justify-center p-1 relative overflow-hidden">
          {/* Subtle diagonal foil shine */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-400/10 to-transparent pointer-events-none" />

          <span className="text-amber-400 text-lg sm:text-2xl font-serif-display drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse">
            ★
          </span>
          <span className="font-arcade text-[7px] sm:text-[8px] text-purple-300 mt-0.5 tracking-wider">
            OSIRIS
          </span>

          {/* Sliding card animation indicator when actively dealing */}
          {isDealing && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
          )}
        </div>
      </div>

      {/* Deck Size Indicator Pill */}
      <div className="mt-2 text-center bg-black/90 border-2 border-purple-800/80 px-2 py-0.5 rounded shadow-manga backdrop-blur-md">
        <div className="font-arcade text-[7px] sm:text-[8px] text-amber-300 tracking-wider">
          THE DECK
        </div>
        <div className="font-mono text-[9px] text-purple-300 font-bold">
          {remainingCards} Cards
        </div>
      </div>
    </div>
  );
};

