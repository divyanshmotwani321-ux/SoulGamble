import React from 'react';

interface Props {
  isActive: boolean; // true when dealer === 'DEALER BOY'
  isDealing?: boolean;
}

export const SideTableDealerBoy: React.FC<Props> = ({ isActive, isDealing = false }) => {
  if (!isActive) return null;

  return (
    <div
      className="neutral-dealer-sidebar flex flex-col items-center gap-1 select-none"
    >
      {/* Dealing animation ping */}
      {isDealing && (
        <div className="absolute -top-2 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping z-10" />
      )}

      {/* Dealer Boy Image */}
      <div
        className={`neutral-dealer-portrait
          relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-3 border-black overflow-hidden
          shadow-[0_0_12px_rgba(251,191,36,0.35),3px_3px_0_#000]
          bg-[#1a2a3a]
          ${isDealing ? 'animate-bounce' : ''}
        `}
      >
        <img
          src="/assets/dealer-boy.png"
          alt="Neutral Dealer — Shoe-Shine Boy"
          className="w-full h-full object-cover object-top scale-110"
          onError={(e) => {
            // Fallback SVG if image fails
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              parent.innerHTML = `
                <svg viewBox="0 0 100 100" class="w-full h-full">
                  <circle cx="50" cy="50" r="40" fill="#e2c8a7" stroke="#000" stroke-width="3"/>
                  <path d="M15 45 Q50 15 85 45 Q50 35 15 45" fill="#4b6a8a" stroke="#000" stroke-width="2"/>
                  <ellipse cx="40" cy="55" rx="5" ry="5" fill="#0f172a"/>
                  <ellipse cx="62" cy="55" rx="5" ry="5" fill="#0f172a"/>
                  <path d="M42 70 Q50 67 58 70" stroke="#000" stroke-width="2.5" fill="none"/>
                  <path d="M30 45 Q28 50 30 52 Q32 50 30 45" fill="#38bdf8"/>
                </svg>
              `;
            }
          }}
        />
      </div>

      {/* Badge */}
      <div className="neutral-dealer-badge rounded-lg px-1.5 py-1 text-center">
        <div className="font-arcade text-[5px] sm:text-[6px] text-amber-300 leading-tight tracking-wider">
          NEUTRAL DEALER
        </div>
        <div className="font-mono text-[6px] sm:text-[7px] text-purple-300 leading-tight">
          SHOE-SHINE BOY
        </div>
      </div>
    </div>
  );
};
