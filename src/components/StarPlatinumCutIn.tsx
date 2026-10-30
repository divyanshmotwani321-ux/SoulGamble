import React, { useEffect } from 'react';
import { sounds } from '../utils/soundEffects.js';
import { Zap, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  abilityName: 'DEAL QTE' | 'DECK TAMPER' | 'PHANTOM STUNT';
  onComplete: () => void;
}

export const StarPlatinumCutIn: React.FC<Props> = ({ isOpen, abilityName, onComplete }) => {
  useEffect(() => {
    if (!isOpen) return;

    // Play Stand cut-in sound effects
    sounds.playStandFreeze();
    sounds.playAccusation();

    // Auto-dismiss after 1.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const getAbilityDetails = () => {
    switch (abilityName) {
      case 'DEAL QTE':
        return {
          title: 'KINETIC PERCEPTION FOCUS',
          sub: 'STAR PLATINUM FREEZES TIME TO READ THE RIGGED DECK',
          kanji: 'ゴゴゴ 時よ止まれ！ ゴゴゴ',
          tag: 'KINETIC VISION [QTE]'
        };
      case 'DECK TAMPER':
        return {
          title: 'DECK POINTER TAMPER',
          sub: 'STAR PLATINUM SWAPS DOUBLY-LINKED LIST POINTERS IN MICROSECONDS',
          kanji: 'オラオラオラ！ ORA ORA ORA!',
          tag: 'STAND ABILITY: DECK SWAP'
        };
      case 'PHANTOM STUNT':
        return {
          title: 'PHANTOM STUNT: TIME STOP BLUFF',
          sub: 'JOTARO SUMMONS A CIGARETTE & DRINK UNNOTICED — PARANOIA SURGES!',
          kanji: 'ゴゴゴ やれやれだぜ... ゴゴゴ',
          tag: 'PSYCHOLOGICAL DOMINANCE'
        };
    }
  };

  const details = getAbilityDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-auto">
      {/* Background purple flash & dark overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="absolute inset-0 purple-aura-flash pointer-events-none" />

      {/* Manga Speedlines Animated Background */}
      <div className="absolute inset-0 manga-speedlines opacity-40 pointer-events-none" />

      {/* Diagonal Anime Cut-in Sash */}
      <div className="relative w-full max-w-5xl py-6 sm:py-8 my-auto clip-diagonal-sash bg-gradient-to-r from-[#2e0854] via-[#4c1d95] to-[#1e0538] border-y-4 border-amber-400 shadow-[0_0_80px_rgba(168,85,247,0.85)] z-20 overflow-hidden transform animate-in slide-in-from-left duration-200">
        {/* Golden Speed Line Accents */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />

        <div className="px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Left: Star Platinum & Jotaro Character Artwork */}
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-2xl border-4 border-black shadow-manga-lg overflow-hidden bg-black ring-4 ring-amber-400/80 transform -rotate-2 hover:rotate-0 transition-transform">
              <img
                src="/assets/star-platinum.jpg"
                alt="Jotaro Kujo & Star Platinum"
                className="w-full h-full object-cover object-top scale-105"
                onError={(e) => {
                  // Fallback if public folder path needs adjustment
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              {/* Stand Name Stamp */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 text-center">
                <span className="font-arcade text-[10px] text-amber-300 tracking-wider">
                  ★ STAR PLATINUM ★
                </span>
              </div>
            </div>

            {/* Floating Kanji Badge */}
            <div className="absolute -top-3 -right-3 bg-purple-950 border-2 border-amber-400 px-3 py-1 rounded-md text-amber-300 font-bold text-xs shadow-manga animate-bounce">
              ORA!
            </div>
          </div>

          {/* Right: Arcade Stand Activation Title & Manga Text */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-black border-2 border-amber-400 shadow-manga">
              <Zap size={16} className="text-amber-400 animate-pulse" />
              <span className="font-arcade text-[11px] text-amber-300 uppercase tracking-widest">
                {details.tag}
              </span>
            </div>

            {/* Main Ability Banner */}
            <h2 className="font-arcade text-xl sm:text-3xl text-white tracking-wider drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 leading-tight">
              {details.title}
            </h2>

            {/* Kanji Sound FX */}
            <div className="font-serif-display text-lg sm:text-2xl font-black text-purple-200 tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {details.kanji}
            </div>

            {/* Explanatory Lore Text */}
            <p className="font-mono text-xs sm:text-sm text-purple-100 max-w-xl font-medium tracking-wide">
              {details.sub}
            </p>

            {/* Arcade Action Alert */}
            <div className="pt-1 flex items-center justify-center md:justify-start gap-2">
              <span className="inline-block w-3 h-3 bg-rose-500 rounded-full animate-ping" />
              <span className="font-arcade text-[10px] text-rose-300 tracking-widest uppercase">
                STAND POWER ENGAGED // TIME SUSPENDED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

