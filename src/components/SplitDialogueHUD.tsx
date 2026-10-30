import React from 'react';

interface DarbyDialogueProps {
  text: string;
  speaker: string;
  isBluffing?: boolean;
}

export const DarbySpeechBubble: React.FC<DarbyDialogueProps> = ({
  text,
  speaker,
  isBluffing = false
}) => {
  return (
    <div className="relative max-w-[440px] sm:max-w-[480px] bg-[#140726]/95 border-3 border-black shadow-manga rounded-2xl p-3.5 sm:p-4 text-slate-100 z-30">
      {/* Speech Bubble Pointer pointing toward D'Arby (bottom-left) */}
      <div className="absolute -bottom-3 left-8 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-black" />
      <div className="absolute -bottom-2 left-8 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#140726]" />

      <div>
        {/* Speaker Header */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-purple-900/60 pb-1 mb-1.5">
          <span className="font-arcade text-[9px] sm:text-[10px] text-amber-300 tracking-wider">
            {speaker}
          </span>
          {isBluffing && (
            <span className="font-arcade text-[8px] px-2 py-0.5 rounded bg-rose-600 text-white border border-black shadow-[1px_1px_0_#000] animate-pulse">
              👁️ TWITCH TELL!
            </span>
          )}
        </div>

        {/* Speech Text */}
        <p className="font-vt323 text-[17px] sm:text-[18px] text-amber-100/95 leading-[1.35] tracking-wide">
          "{text}"
        </p>
      </div>
    </div>
  );
};

interface JotaroDialogueProps {
  text: string;
}

export const JotaroSpeechBubble: React.FC<JotaroDialogueProps> = ({ text }) => {
  return (
    <div className="relative max-w-[440px] sm:max-w-[480px] bg-[#0b1024]/95 border-3 border-cyan-500/80 shadow-manga rounded-2xl p-3.5 sm:p-4 text-slate-100 z-30">
      {/* Speech Bubble Pointer pointing toward player (bottom-right) */}
      <div className="absolute -bottom-3 right-8 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-cyan-500" />
      <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#0b1024]" />

      {/* Speaker Header */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-cyan-900/60 pb-1 mb-1.5">
        <span className="font-arcade text-[9px] sm:text-[10px] text-cyan-300 tracking-wider">
          1P: JOTARO KUJO
        </span>
        <span className="font-arcade text-[8px] text-amber-400">
          ★ RESOLUTE
        </span>
      </div>

      {/* Speech Text */}
      <p className="font-vt323 text-[17px] sm:text-[18px] text-cyan-100/95 leading-[1.35] tracking-wide">
        "{text}"
      </p>
    </div>
  );
};
