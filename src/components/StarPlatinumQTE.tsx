import React, { useEffect, useRef, useState } from 'react';
import { Eye, Zap, Crosshair } from 'lucide-react';
import { sounds } from '../utils/soundEffects.js';

interface Props {
  isActive: boolean;
  qteWindowMultiplier: number;
  onResult: (hit: boolean) => void;
}

export const StarPlatinumQTE: React.FC<Props> = ({ isActive, qteWindowMultiplier, onResult }) => {
  const [position, setPosition] = useState<number>(0);
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [hitResult, setHitResult] = useState<boolean | null>(null);

  const directionRef = useRef<number>(1);
  const animRef = useRef<number | null>(null);
  const posRef = useRef<number>(0);
  const stoppedRef = useRef<boolean>(false);

  // Sweet spot bounds (scaled by lost Jotaro chips)
  const sweetSpotStart = 45;
  const sweetSpotWidth = Math.max(8, 22 * qteWindowMultiplier);
  const sweetSpotEnd = sweetSpotStart + sweetSpotWidth;

  useEffect(() => {
    if (!isActive) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      stoppedRef.current = false;
      setIsStopped(false);
      setHitResult(null);
      return;
    }

    stoppedRef.current = false;
    setIsStopped(false);
    setHitResult(null);

    let pos = 0;
    posRef.current = 0;
    const speed = 1.45;

    const loop = () => {
      if (stoppedRef.current) return;

      pos += speed * directionRef.current;
      if (pos >= 100) {
        pos = 100;
        directionRef.current = -1;
      } else if (pos <= 0) {
        pos = 0;
        directionRef.current = 1;
      }
      posRef.current = pos;
      setPosition(pos);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isActive]);

  const triggerHitCheck = () => {
    if (!isActive || stoppedRef.current) return;
    stoppedRef.current = true;
    setIsStopped(true);

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    const currentPos = posRef.current;
    setPosition(currentPos);

    const hit = currentPos >= sweetSpotStart && currentPos <= sweetSpotEnd;
    setHitResult(hit);

    if (hit) {
      sounds.playStandFreeze();
    } else {
      sounds.playHeartbeat();
    }

    // Brief visual confirmation before returning result
    setTimeout(() => {
      onResult(hit);
    }, 450);
  };

  // Global keydown capture listener specifically for Spacebar
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
        triggerHitCheck();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isActive, sweetSpotStart, sweetSpotEnd]);

  if (!isActive) return null;

  return (
    <div
      onClick={triggerHitCheck}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-crosshair select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          triggerHitCheck();
        }}
        className="relative w-full max-w-lg bg-[#120822] border-4 border-black shadow-manga-lg rounded-2xl p-6 text-center space-y-4 stand-aura"
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-2">
          <Zap size={18} className="text-amber-400 animate-pulse" />
          <span className="font-arcade text-xs sm:text-sm text-amber-300 tracking-wider">
            STAR PLATINUM // KINETIC VISION
          </span>
          <Eye size={18} className="text-purple-400" />
        </div>

        <p className="font-vt323 text-lg text-slate-200">
          Press <strong className="text-amber-400 font-arcade text-xs">[SPACE]</strong> or click anywhere to freeze time on D'Arby's sleight of hand!
        </p>

        {/* Gauge Track */}
        <div className="relative w-full h-10 bg-black rounded-xl overflow-hidden border-3 border-black shadow-manga">
          {/* Sweet Spot Target Zone */}
          <div
            className={`absolute top-0 bottom-0 flex items-center justify-center font-arcade text-[8px] font-black uppercase tracking-wider transition-colors ${
              hitResult === true
                ? 'bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,1)]'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-[0_0_15px_rgba(251,191,36,0.8)]'
            }`}
            style={{
              left: `${sweetSpotStart}%`,
              width: `${sweetSpotWidth}%`
            }}
          >
            TARGET
          </div>

          {/* Moving Needle Indicator */}
          <div
            className={`absolute top-0 bottom-0 w-3 rounded-full transition-transform -translate-x-1/2 ${
              isStopped
                ? hitResult
                  ? 'bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,1)] scale-125'
                  : 'bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,1)] scale-125'
                : 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,1)]'
            }`}
            style={{ left: `${position}%` }}
          />
        </div>

        {/* Target Zone Readout / Result Alert */}
        <div className="flex items-center justify-between font-arcade text-[8px] sm:text-[9px]">
          <span className="text-slate-500">0%</span>
          {hitResult !== null ? (
            <span
              className={`font-arcade text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                hitResult ? 'text-emerald-400 animate-pulse' : 'text-rose-400'
              }`}
            >
              {hitResult ? '★ TARGET ACQUIRED! CHEAT DETECTED! ★' : '☠ MISSED FOCUS! TWITCH TELL! ☠'}
            </span>
          ) : (
            <span className="text-amber-400 tracking-wider">
              Target: {Math.round(sweetSpotStart)}% - {Math.round(sweetSpotEnd)}%
            </span>
          )}
          <span className="text-slate-500">100%</span>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={triggerHitCheck}
          disabled={isStopped}
          className={`w-full py-3.5 rounded-xl font-arcade text-xs uppercase tracking-widest border-3 border-black shadow-manga transition ${
            isStopped
              ? hitResult
                ? 'bg-emerald-500 text-black'
                : 'bg-rose-600 text-white'
              : 'bg-gradient-to-r from-purple-700 via-amber-500 to-purple-700 hover:brightness-110 active:scale-95 text-black'
          }`}
        >
          {isStopped
            ? hitResult
              ? '★ STAND FOCUS LOCKED [SUCCESS] ★'
              : '☠ FOCUS MISSED [TWITCH] ☠'
            : '⚡ STOP NEEDLE NOW! [SPACEBAR] ⚡'}
        </button>
      </div>
    </div>
  );
};
