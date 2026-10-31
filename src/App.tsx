import React, { useEffect, useState, useRef } from 'react';
import { SanitizedGameState, GamePhase, ActionReport } from './server/gameEngine.js';
import { CardView } from './components/CardView.js';
import { DarbyPortrait } from './components/DarbyPortrait.js';
import { DarbyArcadeHUD } from './components/DarbyArcadeHUD.js';
import { PhysicalDeck } from './components/PhysicalDeck.js';
import { DarbySpeechBubble, JotaroSpeechBubble } from './components/SplitDialogueHUD.js';
import { StarPlatinumCutIn } from './components/StarPlatinumCutIn.js';
import { SoulPotStack } from './components/SoulPotStack.js';
import { StarPlatinumQTE } from './components/StarPlatinumQTE.js';
import { SoulVaultModal } from './components/SoulVaultModal.js';
import { ShowdownModal } from './components/ShowdownModal.js';
import { DataStructuresDrawer } from './components/DataStructuresDrawer.js';
import { AvdolAdviserModal } from './components/AvdolAdviserModal.js';
import { GameManualModal } from './components/GameManualModal.js';
import { StarPlatinumReportPopup } from './components/StarPlatinumReportPopup.js';
import { SideTableDealerBoy } from './components/SideTableDealerBoy.js';
import { sounds } from './utils/soundEffects.js';
import {
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  BookOpen,
  RotateCcw,
  Eye,
  EyeOff,
  Zap,
  Coins,
  Bug,
  Lock,
  Layers
} from 'lucide-react';
import { SoulOwner } from './server/structures/SoulStructures.js';
import { debugLogger } from './lib/debugLogger.js';
import { RuntimeDebugDrawer, OnScreenErrorToast, FilterTab } from './components/RuntimeDebugDrawer.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<SanitizedGameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Drawers
  const [isDsDrawerOpen, setIsDsDrawerOpen] = useState<boolean>(false);
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState<boolean>(false);
  const [debugInitialTab, setDebugInitialTab] = useState<FilterTab>('ALL');
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isSoulVaultOpen, setIsSoulVaultOpen] = useState<boolean>(false);
  const [isAvdolModalOpen, setIsAvdolModalOpen] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [isQteOpen, setIsQteOpen] = useState<boolean>(false);
  const [dealTimeLeft, setDealTimeLeft] = useState<number>(5.0);
  const dealTimeLeftRef = useRef<number>(5.0);

  // Pre-deal choice (Step A)
  const [preDealBlindChoice, setPreDealBlindChoice] = useState<boolean>(false);

  // Dynamic Jotaro Voice Line
  const [jotaroLine, setJotaroLine] = useState<string>(
    '"Deal the cards, D\'Arby. Star Platinum is watching every millimeter of your fingers."'
  );

  // Star Platinum Cut-In & Screen Shake State
  const [isCutInOpen, setIsCutInOpen] = useState<boolean>(false);
  const [cutInAbility, setCutInAbility] = useState<'DEAL QTE' | 'DECK TAMPER' | 'PHANTOM STUNT'>('DEAL QTE');
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [isBetAnimating, setIsBetAnimating] = useState<boolean>(false);
  const [dioConfrontation, setDioConfrontation] = useState<'ACCUSATION' | 'SUCCESS' | 'FAILURE' | null>(null);
  const cutInCallbackRef = useRef<(() => void) | null>(null);

  // Selected cards for discard
  const [selectedDiscards, setSelectedDiscards] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Star Platinum Action Report popup (separate from D'Arby's dialogue)
  const [activeActionReport, setActiveActionReport] = useState<ActionReport | null>(null);

  // Trigger Anime Cut-In Overlay with Screen Shake
  const triggerStarPlatinumCutIn = (
    ability: 'DEAL QTE' | 'DECK TAMPER' | 'PHANTOM STUNT',
    callback?: () => void
  ) => {
    setCutInAbility(ability);
    setIsCutInOpen(true);
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), 700);
    cutInCallbackRef.current = callback || null;
  };

  const activateDealScan = () => {
    const currentPhase = gameState?.phase === 'DEALING'
      ? 'DEALING_IN_PROGRESS'
      : gameState?.phase;
    const dealState = dealTimeLeftRef.current > 0
      ? 'DEALING_IN_PROGRESS'
      : 'DEALING_COMPLETE';
    if (
      currentPhase !== 'DEALING_IN_PROGRESS' ||
      dealState !== 'DEALING_IN_PROGRESS' ||
      isQteOpen ||
      isCutInOpen ||
      (gameState?.starPlatinumCharges || 0) <= 0
    ) {
      return;
    }

    triggerStarPlatinumCutIn('DEAL QTE', () => {
      setIsQteOpen(true);
    });
  };

  const handleCutInComplete = () => {
    setIsCutInOpen(false);
    if (cutInCallbackRef.current) {
      const cb = cutInCallbackRef.current;
      cutInCallbackRef.current = null;
      cb();
    }
  };

  // Subscribe to debug logger for live error counting
  useEffect(() => {
    const unsubscribe = debugLogger.subscribe(logs => {
      const errs = logs.filter(
        l => l.level === 'ERROR' || l.category === 'ERROR' || l.category === 'API_ERR'
      ).length;
      setErrorCount(errs);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (dioConfrontation !== 'SUCCESS' && dioConfrontation !== 'FAILURE') return;
    const timer = window.setTimeout(() => setDioConfrontation(null), 7000);
    return () => window.clearTimeout(timer);
  }, [dioConfrontation]);

  // Fetch initial game state
  const fetchState = async () => {
    try {
      const res = await fetch('/api/game/state');
      const data = await res.json();
      if (data.success) {
        setGameState(data.data);
      }
    } catch (err: any) {
      setError('Could not connect to backend engine. Ensure server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Post action to server
  const sendAction = async (action: string, payload?: any) => {
    const prevState = gameState;

    if (action === 'DEMAND_DIO_SECRET') {
      setDioConfrontation('ACCUSATION');
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 700);
      setJotaroLine('"ANSWER ME, D\'ARBY! PUT THE SECRET OF DIO\'S STAND ON THE TABLE RIGHT NOW!"');
    }

    if (action === 'BET_RAISE' || action === 'CALL' || action === 'BLUFF_RAISE') {
      setIsBetAnimating(true);
      sounds.playChip();
      setTimeout(() => setIsBetAnimating(false), 600);
    }

    try {
      setLoading(true);
      const res = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      const data = await res.json();
      if (data.success) {
        setGameState(data.data);
        if (action === 'DEMAND_DIO_SECRET') {
          setDioConfrontation(data.data.phase === 'VICTORY' ? 'SUCCESS' : 'FAILURE');
        }
        debugLogger.logStateTransition(action, prevState, data.data, { payload });

        // Show Star Platinum action report popup if one was emitted
        if (data.data.actionReport) {
          setActiveActionReport(data.data.actionReport);
        }

        if (action === 'NEW_GAME' || action === 'NEXT_HAND') {
          if (action === 'NEW_GAME') setDioConfrontation(null);
          setSelectedDiscards([]);
          setIsQteOpen(false);
          setDealTimeLeft(5.0);
          dealTimeLeftRef.current = 5.0;
          setPreDealBlindChoice(false);
          setActiveActionReport(null);
          setJotaroLine('"Deal the cards, D\'Arby. Star Platinum is watching every millimeter of your fingers."');
          sounds.playCardDeal();
        } else if (action === 'BLIND_TOGGLE') {
          setJotaroLine(
            payload?.isBlind
              ? '"Yare Yare Daze... I don\'t even need to look at my cards to beat a cheat like you."'
              : '"Deal the cards, D\'Arby. Star Platinum is watching every millimeter of your fingers."'
          );
        } else if (action === 'POCKET_INTEL') {
          setJotaroLine('"Hmph. I saw that sleight of hand... let\'s see how far you take this."');
        } else if (action === 'PUBLIC_ACCUSE') {
          setJotaroLine('"I caught your fingers dealing from the bottom! Break his fingers if he tries that again."');
        } else if (action === 'SP_TAMPER') {
          setJotaroLine('"Star Platinum! Too slow, D\'Arby—even for a professional gambler."');
        } else if (action === 'SP_PHANTOM_STUNT') {
          setJotaroLine('"A cigarette? A drink? You couldn\'t even see my Stand move."');
        } else if (action === 'BLUFF_RAISE') {
          setJotaroLine('"You look pale, D\'Arby. Could it be you realized my hand already beats your rigged deal?"');
        } else if (action === 'BET_RAISE') {
          setJotaroLine('"I\'m raising the stakes. Do you have the nerve to call, or are you folding?"');
        } else if (action === 'CHECK') {
          setJotaroLine('"Hmph. Show me your move."');
        } else if (action === 'CALL') {
          setJotaroLine('"I call. Turn over your cards."');
        } else if (action === 'FOLD') {
          setJotaroLine('"Good grief... you win this street. But the match isn\'t over."');
        } else if (action === 'DEMAND_DIO_SECRET') {
          setJotaroLine('"ANSWER ME, D\'ARBY! PUT THE SECRET OF DIO\'S STAND ON THE TABLE RIGHT NOW!"');
        }
      } else {
        if (action === 'DEMAND_DIO_SECRET') setDioConfrontation(null);
        debugLogger.logError(`Action [${action}] rejected: ${data.error || 'Server error'}`, {
          action,
          payload,
          error: data.error
        });
        alert(data.error || 'Action failed');
      }
    } catch (err: any) {
      if (action === 'DEMAND_DIO_SECRET') setDioConfrontation(null);
      debugLogger.logError(`Action [${action}] threw exception: ${err.message}`, {
        action,
        payload,
        stack: err.stack
      });
      setError(err.message || 'Action request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDraw = async (e: React.MouseEvent) => {
    e.preventDefault();
    const prevState = gameState;
    try {
      setLoading(true);
      const res = await fetch('/api/game/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices: selectedDiscards })
      });
      const data = await res.json();
      if (data.success) {
        setGameState(data.data);
        debugLogger.logStateTransition('CONFIRM_DRAW', prevState, data.data, {
          discardIndices: selectedDiscards
        });
        setSelectedDiscards([]);
        setJotaroLine('"Let\'s see what the deck brings."');
        sounds.playCardDeal();
      } else {
        await sendAction('DISCARD', { indices: selectedDiscards });
        setSelectedDiscards([]);
      }
    } catch (err: any) {
      await sendAction('DISCARD', { indices: selectedDiscards });
      setSelectedDiscards([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // 5.0-second dealing phase countdown handler
  useEffect(() => {
    if (gameState?.phase !== 'DEALING' || isQteOpen || isCutInOpen) {
      return;
    }

    setDealTimeLeft(5.0);
    const duration = 5000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      dealTimeLeftRef.current = remaining;
      setDealTimeLeft(remaining);

      if (elapsed >= duration) {
        dealTimeLeftRef.current = 0;
        clearInterval(interval);
        sendAction('SKIP_INSPECT');
      }
    }, 50);

    return () => {
      clearInterval(interval);
      dealTimeLeftRef.current = 0;
    };
  }, [gameState?.phase, isQteOpen, isCutInOpen]);

  // Dual Spacebar Support: Spacebar during 5.0s dealing triggers Star Platinum
  useEffect(() => {
    if (gameState?.phase !== 'DEALING' || isQteOpen || isCutInOpen) return;

    const handleGlobalSpacebar = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        if (
          gameState.phase !== 'DEALING' ||
          dealTimeLeftRef.current <= 0 ||
          (gameState.starPlatinumCharges || 0) <= 0
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        activateDealScan();
      }
    };

    window.addEventListener('keydown', handleGlobalSpacebar, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleGlobalSpacebar, { capture: true });
    };
  }, [gameState?.phase, isQteOpen, isCutInOpen, gameState?.starPlatinumCharges]);

  const handleCardClick = (idx: number) => {
    if (gameState?.phase !== 'DRAW_PHASE') return;
    if (selectedDiscards.includes(idx)) {
      setSelectedDiscards(selectedDiscards.filter(i => i !== idx));
    } else {
      if (selectedDiscards.length < 3) {
        setSelectedDiscards([...selectedDiscards, idx]);
      }
    }
  };

  if (loading && !gameState) {
    return (
      <div className="min-h-screen bg-[#07030d] flex items-center justify-center text-amber-400 font-arcade">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
          <p className="text-xs tracking-widest uppercase">
            CONNECTING TO SERVER ENGINE...
          </p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#07030d] flex items-center justify-center text-rose-400 p-6 text-center font-arcade">
        <div className="border-4 border-black p-6 bg-[#160822] shadow-manga-lg rounded-2xl max-w-md">
          <h2 className="text-base font-bold mb-2 text-rose-400">CONNECTION ERROR</h2>
          <p className="text-xs mb-4 text-slate-300 font-mono">{error || 'Server unreachable'}</p>
          <button
            onClick={fetchState}
            className="px-4 py-2 bg-amber-500 text-black font-arcade text-xs rounded border-2 border-black shadow-manga"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  const {
    phase,
    dealer,
    isBlindHand,
    starPlatinumCharges,
    dioDemandCharges,
    jotaroHand,
    darbyHand,
    dialogue,
    showdownResult,
    dsTelemetry
  } = gameState;

  const jotaroChips = dsTelemetry.soulVault.vaultEntries.find(e => e.owner === 'JOTARO')?.heldByPlayer || 0;
  const potSize = dsTelemetry.soulPot.stackSize;
  const polnareffSafe = dsTelemetry.soulVault.vaultEntries.find(e => e.owner === 'POLNAREFF')?.heldByPlayer || 0;
  const josephSafe = dsTelemetry.soulVault.vaultEntries.find(e => e.owner === 'JOSEPH')?.heldByPlayer || 0;
  const polnareffHeldByDarby = dsTelemetry.soulVault.vaultEntries.find(e => e.owner === 'POLNAREFF')?.heldByDarby || 0;
  const josephHeldByDarby = dsTelemetry.soulVault.vaultEntries.find(e => e.owner === 'JOSEPH')?.heldByDarby || 0;
  const capturedOwners: SoulOwner[] = ['JOTARO', 'AVDOL', 'KAKYOIN', 'HOLLY'];
  const capturedChips = dsTelemetry.soulVault.vaultEntries
    .filter(entry => capturedOwners.includes(entry.owner) && entry.heldByDarby > 0)
    .map(entry => ({ owner: entry.owner, count: entry.heldByDarby }));
  const wagerableOwners: SoulOwner[] = ['JOTARO', 'AVDOL', 'KAKYOIN', 'HOLLY'];
  const wagerableSoulEntries = dsTelemetry.soulVault.vaultEntries.filter(entry =>
    wagerableOwners.includes(entry.owner) && entry.wagerableByPlayer > 0
  );
  const wagerableChipCount = wagerableSoulEntries.reduce(
    (total, entry) => total + entry.wagerableByPlayer,
    0
  );
  const darbyBank = dsTelemetry.soulVault.vaultEntries.reduce(
    (total, entry) => total + entry.heldByDarby,
    0
  );
  const toCall = gameState.toCall || 0;

  // Dealing phase indicator
  const isDealingPhase = phase === 'DEALING';
  const isPreDealSetup = phase === 'BLIND_SELECTION';

  return (
    <div
      className={`game-shell bg-[#07030d] text-slate-200 select-none overflow-hidden ${
        isScreenShaking ? 'screen-shake-intense' : ''
      }`}
    >
      {/* CRT Scanlines & Vignette */}
      <div className="crt-scanlines pointer-events-none" />
      <div className="crt-vignette pointer-events-none" />

      {/* =========================================================
          TOP RETRO ARCADE HEADER HUD
          ========================================================= */}
      <header className="game-header h-14 border-b-3 border-black bg-[#100720]/95 px-3 sm:px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-40 shadow-manga">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 border-2 border-black flex items-center justify-center text-black font-black text-sm shadow-manga">
            ★
          </div>
          <div>
            <h1 className="font-arcade text-xs sm:text-sm text-amber-300 tracking-wider leading-tight">
              SOUL GAMBLE
            </h1>
            <div className="font-arcade text-[8px] text-purple-300 tracking-wider">
              '98 ARCADE SHOWDOWN
            </div>
          </div>
          <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[8px] font-arcade bg-purple-950 border border-purple-600 text-amber-300 shadow-[1px_1px_0_#000]">
            PHASE: {phase}
          </span>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs">
          {/* Jotaro Chips */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border-2 border-black text-amber-300 font-arcade text-[9px] shadow-manga">
            <Coins size={13} />
            <span>{jotaroChips} CHIPS</span>
          </div>

          {/* Souls Saved */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black border border-purple-800 text-purple-300 font-mono text-[11px]">
            <span>Souls: <strong>{polnareffSafe + josephSafe}/12</strong></span>
          </div>

          {/* Game Manual Modal Button */}
          <button
            onClick={() => setIsManualOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 border-2 border-black text-black font-arcade text-[9px] shadow-manga transition"
            title="Open Arcade Game Manual"
          >
            <BookOpen size={12} />
            <span className="hidden sm:inline">MANUAL</span>
          </button>

          {/* Collateral Soul Vault */}
          <button
            onClick={() => setIsSoulVaultOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-900 hover:bg-purple-800 border-2 border-black text-amber-300 font-arcade text-[9px] shadow-manga transition"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">VAULT</span>
          </button>

          {/* Live Data Structures Drawer */}
          <button
            onClick={() => setIsDsDrawerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-arcade text-[9px] border-2 border-black shadow-manga transition"
          >
            <Layers size={12} />
            <span className="hidden sm:inline">DS INSPECT</span>
          </button>

          {/* In-Game Runtime Debugger */}
          <button
            id="debug-logs-toggle-btn"
            onClick={() => {
              setDebugInitialTab('ALL');
              setIsDebugDrawerOpen(true);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-arcade text-[9px] transition border-2 border-black shadow-manga ${
              errorCount > 0
                ? 'bg-rose-700 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-purple-200'
            }`}
            title="Open Runtime Debugger & Event Console"
          >
            <Bug size={12} />
            <span className="hidden sm:inline">DEBUG</span>
            {errorCount > 0 && (
              <span className="ml-1 px-1 py-0.2 rounded bg-white text-black font-black text-[8px]">
                {errorCount}
              </span>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-black border-2 border-black text-slate-300 hover:text-white transition shadow-manga"
            title="Toggle Audio"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Restart */}
          <button
            onClick={() => sendAction('NEW_GAME')}
            className="p-1.5 rounded-lg bg-black border-2 border-black text-slate-300 hover:text-white transition shadow-manga"
            title="Reset Game"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {/* =========================================================
          MAIN FIRST-PERSON VIEW (FPV) POKER SHOWDOWN ARENA
          ========================================================= */}
      <ErrorBoundary
        onOpenDebug={() => {
          setDebugInitialTab('ERRORS');
          setIsDebugDrawerOpen(true);
        }}
      >
        <main className="game-main relative z-10">
          {/* =========================================================
              OPPONENT HORIZON: D'ARBY SEATED, SPEECH BUBBLE & HUD
              ========================================================= */}
          <section className="opponent-area relative w-full items-center px-2 sm:px-6 pt-1">
            {/* Top Left: D'Arby's Dedicated High-Contrast Manga Speech Box */}
            <div className="opponent-dialogue z-20">
              <DarbySpeechBubble
                speaker={dealer}
                text={
                  isDealingPhase
                    ? "Watch closely, Jotaro. The deck is shuffled... I shall now deal five cards to each of us."
                    : dialogue.speaker === 'DANIEL J. D\'ARBY' || dialogue.speaker === 'DEALER BOY'
                      ? dialogue.text
                      : '"Go ahead, Mr. Joestar... make your move."'
                }
                isBluffing={gameState.isDarbyBluffing}
              />
            </div>

            {/* Center: Live 3D-Space Opponent (Daniel J. D'Arby Seated) */}
            <div className="opponent-portrait relative flex flex-col items-center z-10">
              <DarbyPortrait
                fsmState={dsTelemetry.darbyBrain.currentState}
                paranoia={dsTelemetry.darbyBrain.metrics.paranoia}
                composure={dsTelemetry.darbyBrain.metrics.composure}
                dealer={dealer}
                mood={dialogue.portraitMood}
                bankChips={darbyBank}
                streetBet={gameState.darbyStreetBet || 0}
              />
            </div>

            {/* Top Right: Classic Arcade Health-Bar Gauges for Composure/Paranoia */}
            <div className="opponent-sidebar z-20">
              <DarbyArcadeHUD
                fsmState={dsTelemetry.darbyBrain.currentState}
                paranoia={dsTelemetry.darbyBrain.metrics.paranoia}
                composure={dsTelemetry.darbyBrain.metrics.composure}
                bankChips={darbyBank}
                streetBet={gameState.darbyStreetBet || 0}
                polnareffChips={polnareffHeldByDarby}
                josephChips={josephHeldByDarby}
                capturedChips={capturedChips}
                isBluffing={gameState.isDarbyBluffing}
              />
            </div>
          </section>

          {/* =========================================================
              THE FIRST-PERSON VIEW (FPV) 3D CASINO FELT TABLE
              Perspective: 1000px, rotateX(38deg)
              ========================================================= */}
          <section className="table-area perspective-stage w-full my-1">
            <SideTableDealerBoy
              isActive={dealer === 'DEALER BOY'}
              isDealing={isDealingPhase}
            />
            <div className="jotaro-bank-sidebar" aria-label="Jotaro's active chip bank">
              <div className="jotaro-bank-title">
                1P: JOTARO'S CHIP BANK
              </div>
              <div className="jotaro-bank-count">
                <span>ACTIVE BANK:</span>
                <strong>{wagerableChipCount} CHIPS</strong>
              </div>
              <div className="wagerable-chip-groups">
                {wagerableSoulEntries.map(entry => (
                  <div className="wagerable-chip-row" key={`wager-${entry.owner}`}>
                    <span className="wagerable-chip-label">{entry.owner}</span>
                    <div className="wagerable-chip-icons">
                      {Array.from({ length: entry.wagerableByPlayer }).map((_, index) => (
                        <span
                          className={`wagerable-chip wagerable-chip-${entry.owner.toLowerCase()}`}
                          key={`${entry.owner}-${index}`}
                          title={`${entry.name} active chip`}
                        >
                          {entry.owner === 'JOTARO' ? '★' : entry.owner[0]}
                        </span>
                      ))}
                    </div>
                    <span className="wagerable-chip-count">×{entry.wagerableByPlayer}</span>
                  </div>
                ))}
              </div>
              <div className="jotaro-liberated-row" aria-label={`Liberated souls: ${polnareffSafe + josephSafe} of 12`}>
                <span className="jotaro-liberated-label">
                  🔒 LIBERATED SOULS ({polnareffSafe + josephSafe}/12)
                </span>
                <span className="jotaro-liberated-icons">
                  {([
                    ['POLNAREFF', polnareffSafe, '/assets/polnareff-chip.jpg'],
                    ['JOSEPH', josephSafe, '/assets/joseph-chip.jpg']
                  ] as const).map(([owner, count, image]) => (
                    <span className="jotaro-liberated-group" key={`recovered-${owner}`}>
                      <span className="jotaro-liberated-stack">
                        {Array.from({ length: count }).map((_, index) => (
                          <span className="soul-chip-darby recovered-soul-chip" key={`${owner}-${index}`}>
                            <img src={image} alt={`${owner} liberated soul chip`} draggable={false} />
                          </span>
                        ))}
                      </span>
                      <span>{owner === 'POLNAREFF' ? 'P' : 'J'}:{count}</span>
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <div className="fpv-table felt-surface w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col justify-between items-center relative select-none">
              {/* Inlaid Gold Ring on Felt */}
              <div className="felt-gold-ring" />

              {/* Top Row on Felt: Visible 3D Deck + D'Arby's 5 Cards */}
              <div className="relative z-20 w-full flex items-center justify-between px-2 sm:px-6">
                {/* Physical 3D Deck sitting on table near D'Arby */}
                <PhysicalDeck
                  remainingCards={gameState.remainingDeckCards || 42}
                  isDealing={isDealingPhase}
                />

                {/* D'Arby's 5 Cards (Far edge of table felt in front of D'Arby) */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-1 ml-2">
                  {isPreDealSetup ? (
                    <div className="p-3 border-2 border-dashed border-amber-500/30 rounded-xl font-arcade text-[8px] text-amber-300/60 bg-black/40">
                      [D'ARBY CARDS IN DECK — PENDING DEAL]
                    </div>
                  ) : (
                    darbyHand.map((c, idx) => (
                      <CardView
                        key={c.id || idx}
                        card={c}
                        isOpponent={true}
                        isDealing={isDealingPhase}
                        dealIndex={idx * 2 + 1}
                        flipped={phase === 'SHOWDOWN' || phase === 'VICTORY'}
                        faceDown={isDealingPhase}
                        label={`D'Arby #${idx + 1}`}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Center: The 3D Soul Pot Stack & Live Action Ticker */}
              <div className="relative z-20 flex flex-col items-center gap-2 my-auto">
                {/* Dealer Feed Action Ticker */}
                <div className="px-3.5 py-1 rounded-full bg-black/90 border-2 border-amber-400 shadow-manga backdrop-blur-md flex items-center justify-between gap-3 text-xs max-w-md w-full">
                  <div className="flex items-center gap-1.5 text-amber-400 font-arcade text-[8px] uppercase shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>DEALER:</span>
                  </div>
                  <div className="font-vt323 text-base text-amber-100 truncate text-center flex-1">
                    {gameState.actionFeed && gameState.actionFeed.length > 0 ? (
                      gameState.actionFeed[0]
                    ) : (
                      "Waiting for opening bets..."
                    )}
                  </div>
                  {gameState.currentStreet && (
                    <span className="font-arcade text-[7px] px-1.5 py-0.5 rounded bg-purple-900 border border-purple-600 text-purple-200">
                      {gameState.currentStreet}
                    </span>
                  )}
                </div>

                {/* 3D Stacked Soul Coins */}
                <SoulPotStack
                  potSize={potSize}
                  potChips={dsTelemetry.soulPot.potChips}
                  recentActionFeed={gameState.actionFeed}
                  isAnimatingBet={isBetAnimating}
                />
              </div>

              {/* Bottom Row on Felt: Jotaro's 5 Cards (Near edge, closest to player) */}
              <div className="relative z-20 flex flex-col items-center gap-1 mt-auto">
                <div className="flex items-center justify-center gap-2 sm:gap-4 pb-2">
                  {isPreDealSetup ? (
                    <div className="p-3 border-2 border-dashed border-cyan-500/30 rounded-xl font-arcade text-[8px] text-cyan-300/60 bg-black/40">
                      [JOTARO CARDS IN DECK — CHOOSE APPROACH BELOW]
                    </div>
                  ) : (
                    jotaroHand.map((c, idx) => (
                      <CardView
                        key={c.id || idx}
                        card={c}
                        isOpponent={false}
                        isSelected={selectedDiscards.includes(idx)}
                        canSelect={phase === 'DRAW_PHASE'}
                        isDealing={isDealingPhase}
                        dealIndex={idx * 2}
                        faceDown={isDealingPhase}
                        onClick={() => handleCardClick(idx)}
                        label={phase === 'DRAW_PHASE' ? 'DISCARD' : `Card #${idx + 1}`}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              BOTTOM: JOTARO'S 90s ARCADE CONTROL HUD & SPLIT SPEECH
              ========================================================= */}
          <section className="player-area w-full bg-[#100720]/95 border-3 border-black shadow-manga-lg rounded-2xl p-3 sm:p-4 space-y-3 backdrop-blur-md">
            {/* Player Status & Tactical Resource Bar */}
            <div className="player-status flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-black/80 pb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="player-identity flex items-center gap-2">
                  <img
                    src="/assets/jotaro-closeup.png"
                    alt="Jotaro Kujo"
                    className="player-portrait w-14 h-14 rounded-lg border-2 border-cyan-300 object-cover object-top shadow-[0_0_14px_rgba(34,211,238,.5)]"
                  />
                  <span className="font-arcade text-[9px] sm:text-[10px] text-amber-300">
                    1P: JOTARO KUJO (YOU — THE PLAYER)
                  </span>
                </div>
                <span
                  className={`font-arcade text-[8px] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_#000] ${
                    isBlindHand
                      ? 'bg-rose-950 text-rose-300'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {isBlindHand ? 'HAND: LOCKED BLIND (1.5x PARANOIA)' : 'HAND: REVEALED'}
                </span>

                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-black border border-purple-800 text-purple-200">
                    Street Bet: <strong className="text-amber-300">{gameState.jotaroStreetBet || 0}</strong>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border font-bold ${
                      toCall > 0
                        ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                        : 'bg-black border-slate-700 text-slate-400'
                    }`}
                  >
                    To Call: <strong>{toCall} Chips</strong>
                  </span>
                </div>
              </div>

              {/* Tactical Charges & Avdol Adviser Button */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsAvdolModalOpen(true)}
                  disabled={!gameState.avdolAdvice?.available}
                  className={`px-3 py-1.5 rounded-lg border-2 border-black font-arcade text-[9px] uppercase tracking-wider flex items-center gap-1.5 shadow-manga transition ${
                    gameState.avdolAdvice?.available
                      ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 hover:brightness-110 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  title={
                    gameState.avdolAdvice?.available
                      ? "Consult Muhammad Avdol for D'Arby's discard tells & bluff likelihood"
                      : "Avdol advice locked (Avdol soul chips at risk)"
                  }
                >
                  <Flame size={12} className="text-amber-300" />
                  <span>CONSULT AVDOL</span>
                </button>

                <span className="font-arcade text-[9px] text-purple-300 flex items-center gap-1 bg-black px-2 py-1 rounded border border-purple-900">
                  <Zap size={12} className="text-amber-400" />
                  SP: <strong className="text-amber-300">{starPlatinumCharges}/3</strong>
                </span>
                <span className="font-arcade text-[9px] text-purple-300 flex items-center gap-1 bg-black px-2 py-1 rounded border border-purple-900">
                  <Flame size={12} className="text-rose-400" />
                  DIO: <strong className="text-amber-300">{dioDemandCharges}/3</strong>
                </span>
              </div>
            </div>

            {/* Split Dialogue: Jotaro's Dedicated Speech Box on Bottom Player Side */}
            <div className="flex items-center justify-start">
              <JotaroSpeechBubble text={jotaroLine} />
            </div>

            {/* =========================================================
                DYNAMIC CONTEXTUAL ARCADE ACTION CONTROLS
                ========================================================= */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {/* Step A: Pre-Deal Setup (Before Cards Leave Deck) */}
              {phase === 'BLIND_SELECTION' && (
                <div className="w-full flex flex-col items-center gap-2.5">
                  <div className="font-arcade text-[9px] text-amber-300 uppercase tracking-widest">
                    ★ STEP A: SELECT APPROACH BEFORE DEAL ★
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPreDealBlindChoice(false);
                        setJotaroLine('"Deal the cards, D\'Arby. Star Platinum is watching every millimeter of your fingers."');
                      }}
                      className={`px-4 py-2.5 rounded-xl font-arcade text-[9px] uppercase tracking-wider flex items-center gap-2 border-3 border-black shadow-manga transition ${
                        !preDealBlindChoice
                          ? 'bg-amber-400 text-black font-bold ring-2 ring-amber-300'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Eye size={14} />
                      <span>[👁️ PLAY NORMAL (LOOK AFTER DEAL)]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPreDealBlindChoice(true);
                        setJotaroLine('"Yare Yare Daze... I don\'t even need to look at my cards to beat a cheat like you."');
                      }}
                      className={`px-4 py-2.5 rounded-xl font-arcade text-[9px] uppercase tracking-wider flex items-center gap-2 border-3 border-black shadow-manga transition ${
                        preDealBlindChoice
                          ? 'bg-purple-700 text-amber-300 font-bold ring-2 ring-purple-400'
                          : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                      }`}
                    >
                      <EyeOff size={14} />
                      <span>[🙈 LOCK HAND BLIND (1.5x PARANOIA)]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sounds.playCardDeal();
                        sendAction('BLIND_TOGGLE', { isBlind: preDealBlindChoice });
                      }}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-500 hover:brightness-110 active:scale-95 text-black font-arcade text-[10px] uppercase tracking-widest border-3 border-black shadow-manga transition animate-pulse"
                    >
                      <span>[🃏 START DEALING &rarr;]</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step B: 5.0s Dealing Animation & Star Platinum Window */}
              {phase === 'DEALING' && (
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="w-full max-w-lg bg-[#140822] border-3 border-black rounded-xl p-3 shadow-manga flex flex-col items-center gap-2.5">
                    <div className="flex items-center justify-between w-full font-arcade text-[9px]">
                      <span className="flex items-center gap-1.5 text-amber-300 tracking-wider">
                        <Zap size={14} className="text-amber-400 animate-pulse" />
                        DEALING IN PROGRESS ({dealTimeLeft.toFixed(1)}s)
                      </span>
                      <span className="text-purple-300">
                        SP CHARGES: {starPlatinumCharges}/3
                      </span>
                    </div>

                    {/* 5.0-second countdown bar */}
                    <div className="w-full h-3 bg-black rounded-full overflow-hidden border-2 border-purple-800 p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-purple-500 transition-all duration-75 rounded-full"
                        style={{ width: `${(dealTimeLeft / 5.0) * 100}%` }}
                      />
                    </div>

                    {starPlatinumCharges > 0 ? (
                      <button
                        type="button"
                        onClick={activateDealScan}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-amber-500 to-purple-700 hover:brightness-110 text-black font-arcade text-[10px] uppercase tracking-wider border-3 border-black shadow-manga flex items-center justify-center gap-2 transition animate-pulse"
                      >
                        <Zap size={15} />
                        <span>[⚡ ACTIVATE STAR PLATINUM — {dealTimeLeft.toFixed(1)}s] (PRESS SPACE OR CLICK)</span>
                      </button>
                    ) : (
                      <div className="font-arcade text-[8px] text-slate-400 py-1">
                        [0 SP CHARGES — DEALING CARDS NORMALLY...]
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Phase 2: Accusation Window */}
              {phase === 'ACCUSATION_WINDOW' && (
                <>
                  <button
                    type="button"
                    onClick={() => sendAction('PUBLIC_ACCUSE')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-arcade text-[9px] uppercase tracking-wider border-2 border-black shadow-manga flex items-center gap-2 transition"
                  >
                    <span>SNAP FINGER & ACCUSE CHEAT (-25 COMPOSURE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAction('POCKET_INTEL')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-black text-amber-300 font-arcade text-[9px] uppercase tracking-wider shadow-manga flex items-center gap-2 transition"
                  >
                    <span>STAY SILENT & POCKET INTEL (UNLOCK TAMPER)</span>
                  </button>
                </>
              )}

              {/* Phase 3: Draw Phase */}
              {phase === 'DRAW_PHASE' && (
                <>
                  <button
                    type="button"
                    onClick={handleConfirmDraw}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-arcade text-[10px] uppercase tracking-wider border-2 border-black shadow-manga transition"
                  >
                    CONFIRM DRAW ({selectedDiscards.length} DISCARDED)
                  </button>
                  {gameState.hasPocketedIntel && (
                    <button
                      type="button"
                      disabled={gameState.hasTamperedThisHand || !gameState.canTamper}
                      onClick={() => {
                        triggerStarPlatinumCutIn('DECK TAMPER', () => {
                          sendAction('SP_TAMPER');
                        });
                      }}
                      className={`px-4 py-2.5 rounded-xl border-2 border-black font-arcade text-[9px] uppercase tracking-wider flex items-center gap-2 shadow-manga transition ${
                        gameState.hasTamperedThisHand
                          ? 'bg-purple-950 text-purple-400/60 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 text-amber-300'
                      }`}
                    >
                      <Zap size={14} />
                      <span>
                        {gameState.hasTamperedThisHand
                          ? '★ DECK TAMPERED (INVERTED)'
                          : 'STAR PLATINUM DECK TAMPER (1 CHARGE)'}
                      </span>
                    </button>
                  )}
                </>
              )}

              {/* Phase: Pre-Draw or Post-Draw Betting Rounds */}
              {(phase === 'PRE_DRAW_BETTING' || phase === 'POST_DRAW_BETTING' || phase === 'BETTING_ROUND') && (
                <div className="w-full flex flex-wrap items-center justify-center gap-2">
                  <div className="w-full text-center font-arcade text-[9px] text-purple-300 mb-1">
                    <span className="px-3 py-1 rounded bg-black border border-purple-800 text-amber-300">
                      {phase === 'PRE_DRAW_BETTING' ? 'STREET: PRE-DRAW BETS' : 'STREET: POST-DRAW FINAL BETS'}
                    </span>
                    {toCall > 0 && (
                      <span className="ml-2 text-rose-400 font-bold">
                        FACING BET: {toCall} CHIP{toCall > 1 ? 'S' : ''} TO CALL
                      </span>
                    )}
                  </div>

                  {toCall === 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => sendAction('CHECK')}
                        className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 font-arcade text-[9px] uppercase tracking-wider text-amber-300 border-2 border-black shadow-manga transition"
                      >
                        CHECK
                      </button>
                      <button
                        type="button"
                        disabled={jotaroChips < 1}
                        onClick={() => sendAction('BET_RAISE', { amount: 1 })}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-arcade text-[9px] uppercase tracking-wider text-white border-2 border-black shadow-manga transition"
                      >
                        BET 1 CHIP
                      </button>
                      <button
                        type="button"
                        disabled={jotaroChips < 2}
                        onClick={() => sendAction('BET_RAISE', { amount: 2 })}
                        className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-arcade text-[9px] uppercase tracking-wider text-white border-2 border-black shadow-manga transition"
                      >
                        BET 2 CHIPS
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => sendAction('CALL')}
                        className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 font-arcade text-[9px] uppercase tracking-wider text-white border-2 border-black shadow-manga transition"
                      >
                        CALL ({toCall} CHIP{toCall > 1 ? 'S' : ''})
                      </button>
                      <button
                        type="button"
                        disabled={jotaroChips <= toCall}
                        onClick={() => sendAction('BET_RAISE', { amount: toCall + 1 })}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-arcade text-[9px] uppercase tracking-wider text-white border-2 border-black shadow-manga transition"
                      >
                        RAISE TO {toCall + 1} CHIPS
                      </button>
                      <button
                        type="button"
                        onClick={() => sendAction('FOLD')}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-black font-arcade text-[9px] uppercase tracking-wider text-rose-300 shadow-manga transition"
                      >
                        FOLD HAND
                      </button>
                    </>
                  )}

                  {/* Two-Way Player Bluff Action Button */}
                  <button
                    type="button"
                    disabled={gameState.hasBluffedThisHand || jotaroChips < 1}
                    onClick={() => {
                      sendAction('BLUFF_RAISE', { amount: 1 });
                    }}
                    className={`px-4 py-2 rounded-xl font-arcade text-[9px] uppercase tracking-wider flex items-center gap-1.5 border-2 border-black shadow-manga transition ${
                      gameState.hasBluffedThisHand || jotaroChips < 1
                        ? 'bg-slate-900 text-slate-500 cursor-not-allowed border-slate-800 opacity-60'
                        : 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 hover:brightness-110 text-white animate-pulse'
                    }`}
                    title={
                      gameState.hasBluffedThisHand
                        ? 'Bluff raise already used this hand'
                        : 'Intimidate D\'Arby (+18% Paranoia) with psychological bluff'
                    }
                  >
                    <span>😏 BLUFF RAISE (+1 CHIP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSoulVaultOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-800 to-purple-900 hover:brightness-110 border-2 border-black text-amber-300 font-arcade text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-manga transition"
                  >
                    <Sparkles size={12} />
                    <span>PLEDGE SOUL</span>
                  </button>

                  {/* DIO stunt remains contextual; demand is always available during betting. */}
                  {(phase === 'POST_DRAW_BETTING' || phase === 'BETTING_ROUND') && (
                    <>
                      {gameState.canPhantomStunt && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerStarPlatinumCutIn('PHANTOM STUNT', () => {
                              sendAction('SP_PHANTOM_STUNT');
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 border-2 border-black text-white font-arcade text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-manga transition"
                        >
                          <Zap size={12} className="text-amber-400" />
                          <span>PHANTOM STUNT (+35 PARANOIA)</span>
                        </button>
                      )}

                    </>
                  )}
                  {dioDemandCharges > 0 && (
                    <button
                      type="button"
                      onClick={() => sendAction('DEMAND_DIO_SECRET')}
                      className="dio-demand-button px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 hover:brightness-125 text-black font-arcade text-[9px] uppercase tracking-wider border-2 border-black shadow-manga flex items-center gap-1 transition animate-pulse"
                    >
                      <Flame size={14} />
                      <span>
                        🔥 DEMAND DIO'S STAND SECRET! (Chance: {dsTelemetry.darbyBrain.metrics.paranoia}%)
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Phase 5: Between Hands / Victory / Defeat */}
              {(phase === 'BETWEEN_HANDS' || phase === 'SHOWDOWN') && (
                <button
                  type="button"
                  onClick={() => sendAction('NEXT_HAND')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-arcade text-[10px] uppercase tracking-wider border-2 border-black shadow-manga transition"
                >
                  [DEAL NEXT HAND &rarr;]
                </button>
              )}

              {(phase === 'VICTORY' || phase === 'DEFEAT') && (
                <button
                  type="button"
                  onClick={() => sendAction('NEW_GAME')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 text-black font-arcade text-xs uppercase tracking-wider border-3 border-black shadow-manga transition"
                >
                  ★ PLAY AGAIN (RESET MATCH) ★
                </button>
              )}
            </div>
          </section>
        </main>
      </ErrorBoundary>

      {/* =========================================================
          INTERACTIVE MODALS & DRAWERS
          ========================================================= */}
      {dioConfrontation && (
        <div className="dio-confrontation fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#090311]/95">
          <div className="dio-confrontation-speedlines absolute inset-0" />
          <img
            src="/assets/dio.png"
            alt="DIO looming over the confrontation"
            className="dio-confrontation-dio absolute right-0 bottom-0 h-full max-w-[70vw] object-contain object-bottom opacity-75"
          />
          <div className="dio-confrontation-kanji absolute inset-0 pointer-events-none" aria-hidden="true">
            <span>ゴゴゴ</span>
            <span>ゴゴゴ</span>
            <span>ゴゴゴ</span>
          </div>

          <div className="relative z-10 flex w-full flex-col items-center gap-5 px-4 sm:px-10">
            <div className="dio-accusation-banner flex w-full max-w-5xl items-center gap-3 sm:gap-6 border-y-4 border-amber-300 bg-gradient-to-r from-cyan-950 via-slate-950 to-purple-950 p-3 sm:p-5 shadow-[0_0_40px_rgba(34,211,238,.5)]">
              <img
                src="/assets/jotaro-closeup.png"
                alt="Jotaro Kujo confronting D'Arby"
                className="h-16 w-16 shrink-0 rounded-full border-4 border-cyan-300 object-cover object-top sm:h-24 sm:w-24"
              />
              <div>
                <div className="font-arcade text-[8px] text-cyan-300 sm:text-xs">
                  JOTARO KUJO — ACCUSATION
                </div>
                <p className="mt-2 font-arcade text-[10px] leading-relaxed text-white sm:text-base">
                  ANSWER ME, D'ARBY! PUT THE SECRET OF DIO'S STAND ON THE TABLE RIGHT NOW!
                </p>
              </div>
            </div>

            <div className={`dio-counter-banner flex w-full max-w-4xl items-center gap-3 border-y-4 border-rose-400 bg-black/90 p-3 text-left shadow-[0_0_40px_rgba(244,63,94,.55)] sm:gap-5 sm:p-4 ${dioConfrontation === 'SUCCESS' ? 'dio-counter-success' : ''}`}>
              <div className="darby-cut-in-portrait shrink-0">
                <span className="sr-only">Daniel J. D'Arby in shock</span>
              </div>
              <div>
                <div className="font-arcade text-[8px] text-rose-300 sm:text-[10px]">
                  D'ARBY'S RESPONSE
                </div>
                <p className="mt-2 font-arcade text-[10px] leading-relaxed text-amber-100 sm:text-sm">
                  {dioConfrontation === 'ACCUSATION'
                    ? "W-What? You dare demand Lord DIO's secret from me?!"
                    : dioConfrontation === 'SUCCESS'
                      ? "Y-You insane fool... If I betray Lord DIO's secret, my soul is forfeit anyway! But seeing those cards... AAAAAAGH! I yield!"
                      : "Heh... Heh heh heh. You think a hollow bluff can shake my loyalty to Lord DIO? You're playing with fire, Jotaro. Show me your hand!"}
                </p>
                {dioConfrontation === 'SUCCESS' && (
                  <div className="mt-3 font-arcade text-[9px] text-emerald-300 animate-pulse">
                    CATATONIC COLLAPSE — JOTARO WINS — REVEALING BOTH HANDS
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(phase === 'VICTORY' || phase === 'DEFEAT') && !dioConfrontation && (
        <div className={`match-result-overlay fixed inset-0 z-[90] flex items-center justify-center p-4 ${phase === 'VICTORY' ? 'match-victory' : 'match-defeat'}`}>
          <div className="w-full max-w-3xl rounded-2xl border-4 border-amber-300 bg-[#100720]/95 p-6 text-center shadow-[0_0_70px_rgba(251,191,36,.48)] sm:p-10">
            <img
              src={phase === 'VICTORY' ? '/assets/jotaro-closeup.png' : '/assets/darby-seated.png'}
              alt={phase === 'VICTORY' ? 'Jotaro Kujo wins' : 'Daniel J. D’Arby defeated Jotaro'}
              className="mx-auto mb-4 h-24 w-24 rounded-full border-4 border-cyan-300 object-cover object-top"
            />
            <div className="font-arcade text-[9px] tracking-widest text-cyan-200 sm:text-xs">
              SOUL GAMBLE — MATCH COMPLETE
            </div>
            <h2 className={`mt-4 font-arcade text-2xl sm:text-4xl ${phase === 'VICTORY' ? 'text-amber-300' : 'text-rose-300'}`}>
              {phase === 'VICTORY' ? '★ MATCH VICTORY ★' : '☠ GAME OVER ☠'}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl font-vt323 text-xl text-slate-100 sm:text-2xl">
              {dialogue.text}
            </p>
            <p className="mt-4 font-arcade text-[8px] text-amber-200 sm:text-[10px]">
              LIBERATED SOULS: {polnareffSafe + josephSafe}/12
            </p>
            {phase === 'VICTORY' && (
              <div className="match-revealed-hands mt-5 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
                {([
                  ['1P: JOTARO KUJO', jotaroHand, false],
                  ["2P: D'ARBY", darbyHand, true]
                ] as const).map(([label, hand, isOpponent]) => (
                  <div className="rounded-xl border border-amber-300/50 bg-black/65 p-3" key={label}>
                    <div className="mb-2 text-center font-arcade text-[7px] text-amber-200">
                      {label}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {hand.map((card, index) => (
                        <CardView
                          key={card.id || `${label}-${index}`}
                          card={card}
                          isOpponent={isOpponent}
                          flipped={isOpponent}
                          label={`#${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => sendAction('NEW_GAME')}
              className="mt-7 rounded-xl border-2 border-black bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 px-6 py-3 font-arcade text-[10px] text-black shadow-manga transition hover:brightness-110 sm:text-xs"
            >
              ★ PLAY AGAIN (RESET MATCH) ★
            </button>
          </div>
        </div>
      )}

      {/* 1. Star Platinum Anime Diagonal Cut-In Overlay */}
      <StarPlatinumCutIn
        isOpen={isCutInOpen}
        abilityName={cutInAbility}
        onComplete={handleCutInComplete}
      />

      {/* 2. Showdown Results Modal */}
      <ShowdownModal
        isOpen={phase === 'SHOWDOWN'}
        jotaroHand={jotaroHand}
        darbyHand={darbyHand}
        showdownResult={showdownResult}
        potSize={potSize}
        onNextHand={() => sendAction('NEXT_HAND')}
      />

      {/* 3. Star Platinum QTE Timing Window */}
      <StarPlatinumQTE
        isActive={isQteOpen || phase === 'OBSERVE_WINDOW'}
        qteWindowMultiplier={dsTelemetry.soulVault.qteWindowMultiplier}
        onResult={(hit: boolean) => {
          setIsQteOpen(false);
          sendAction('SP_OBSERVE', { hitCheat: hit });
        }}
      />

      {/* 4. Open Soul Vault Collateral Modal */}
      <SoulVaultModal
        isOpen={isSoulVaultOpen}
        onClose={() => setIsSoulVaultOpen(false)}
        vaultEntries={dsTelemetry.soulVault.vaultEntries}
        jotaroActiveChips={jotaroChips}
        toCall={toCall}
        darbyBank={darbyBank}
        onPledge={(owner: SoulOwner, amount: number) =>
          sendAction('PLEDGE_SOUL', { owner, amount })
        }
      />

      {/* 5. Live Data Structures Evaluation Drawer */}
      <DataStructuresDrawer
        isOpen={isDsDrawerOpen}
        onClose={() => setIsDsDrawerOpen(false)}
        telemetry={dsTelemetry}
      />

      {/* 6. Runtime Debugger & Event Logger Drawer */}
      <RuntimeDebugDrawer
        isOpen={isDebugDrawerOpen}
        onClose={() => setIsDebugDrawerOpen(false)}
        initialTab={debugInitialTab}
      />

      {/* 7. Floating On-Screen Error Toast */}
      <OnScreenErrorToast
        onOpenDebug={() => {
          setDebugInitialTab('ERRORS');
          setIsDebugDrawerOpen(true);
        }}
      />

      {/* 8. Muhammad Avdol Retro RPG Adviser Modal */}
      <AvdolAdviserModal
        isOpen={isAvdolModalOpen}
        onClose={() => setIsAvdolModalOpen(false)}
        advice={gameState.avdolAdvice}
        fsmState={dsTelemetry.darbyBrain.currentState}
        paranoia={dsTelemetry.darbyBrain.metrics.paranoia}
        composure={dsTelemetry.darbyBrain.metrics.composure}
      />

      {/* 9. Retro Arcade Game Manual Modal */}
      <GameManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* 10. Star Platinum Action Report Popup (player-side, bottom-right) */}
      <StarPlatinumReportPopup
        report={activeActionReport}
        onDismiss={() => setActiveActionReport(null)}
      />
    </div>
  );
};
