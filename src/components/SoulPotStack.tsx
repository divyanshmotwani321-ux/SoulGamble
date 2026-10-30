import React from 'react';
import { Coins } from 'lucide-react';
import { SoulChip } from '../server/structures/SoulStructures.js';

interface Props {
  potSize: number;
  potChips: SoulChip[];
  recentActionFeed?: string[];
  isAnimatingBet?: boolean;
}

export const SoulPotStack: React.FC<Props> = ({
  potSize,
  potChips,
  isAnimatingBet = false
}) => (
  <div className="relative flex flex-col items-center justify-center select-none card-3d-wrapper soul-pot">
    <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

    {isAnimatingBet && (
      <div className="absolute -top-8 z-30 chip-slide-in">
        <div className="soul-chip-jotaro">★</div>
      </div>
    )}

    <div className="soul-pot-chips" aria-label={`${potSize} chips in the pot`}>
      {potChips.map((chip, index) => {
        const chipClass = chip.owner === 'POLNAREFF' || chip.owner === 'JOSEPH'
          ? 'soul-chip-darby'
          : `soul-chip-jotaro soul-chip-${chip.owner.toLowerCase()}`;
        const chipImage = chip.owner === 'POLNAREFF'
          ? '/assets/polnareff-chip.jpg'
          : chip.owner === 'JOSEPH'
            ? '/assets/joseph-chip.jpg'
            : null;

        return (
          <div
            key={chip.id}
            className={`${chipClass} soul-pot-chip`}
            style={{ transform: `rotate(${(index * 17) % 18 - 9}deg)` }}
            title={`${chip.owner} chip`}
          >
            {chipImage
              ? <img src={chipImage} alt={`${chip.owner} soul chip`} draggable={false} />
              : '★'}
          </div>
        );
      })}
    </div>

    <div className="mt-1 text-center bg-black/85 border-2 border-amber-400/80 px-3 py-1 rounded-xl shadow-manga backdrop-blur-md">
      <div className="flex items-center justify-center gap-1.5">
        <Coins size={13} className="text-amber-400" />
        <span className="font-arcade text-[9px] sm:text-[10px] text-amber-300 tracking-wider">
          POT: {potSize} SOULS
        </span>
      </div>
      <div className="font-mono text-[8px] text-purple-300">
        [LIFO OSIRIS STACK]
      </div>
    </div>
  </div>
);
