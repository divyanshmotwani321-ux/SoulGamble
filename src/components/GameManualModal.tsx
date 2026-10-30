import React, { useState } from 'react';
import { BookOpen, X, Shield, Zap, Flame, Brain, Layers, ChevronRight, Trophy, Skull } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ManualTab = 'RULES' | 'DEAL_QTE' | 'BLUFFING' | 'DATA_STRUCTURES' | 'ABILITIES';

export const GameManualModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ManualTab>('RULES');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto select-none">
      <div className="relative w-full max-w-4xl bg-[#120822] border-4 border-black shadow-manga-lg rounded-2xl p-5 sm:p-7 text-slate-100 space-y-4 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-3 border-black pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 border-2 border-black flex items-center justify-center text-black font-black text-sm shadow-manga">
              📖
            </div>
            <div>
              <h2 className="font-arcade text-xs sm:text-sm text-amber-300 tracking-wider">
                SOUL GAMBLE // '98 ARCADE GAME MANUAL
              </h2>
              <div className="font-arcade text-[8px] text-purple-300">
                OFFICIAL POKER STRATEGY & DATA STRUCTURES COMPENDIUM
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black hover:bg-rose-950 border-2 border-black text-slate-300 hover:text-white transition shadow-manga font-arcade text-xs"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 border-b-2 border-black/80 pb-2 shrink-0">
          {[
            { id: 'RULES', label: 'RULES & VICTORY', icon: Trophy },
            { id: 'DEAL_QTE', label: 'DEAL & 5s SP QTE', icon: Zap },
            { id: 'BLUFFING', label: 'TWO-WAY BLUFFS', icon: Flame },
            { id: 'DATA_STRUCTURES', label: 'CUSTOM DATA STRUCTURES', icon: Layers },
            { id: 'ABILITIES', label: 'STAND ABILITIES', icon: Brain },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ManualTab)}
                className={`px-3 py-1.5 rounded-lg font-arcade text-[9px] uppercase tracking-wider flex items-center gap-1.5 border-2 border-black shadow-manga transition ${
                  isCurrent
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-black text-purple-300 hover:bg-purple-950 hover:text-white'
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs leading-relaxed font-mono">
          {/* TAB 1: RULES & VICTORY */}
          {activeTab === 'RULES' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-black/80 border-2 border-purple-900 rounded-xl space-y-2">
                <h3 className="font-arcade text-[11px] text-amber-300 flex items-center gap-2">
                  <Trophy size={14} className="text-amber-400" />
                  THE PREMISE & VICTORY CONDITIONS
                </h3>
                <p className="text-slate-300">
                  You play as <strong>Jotaro Kujo</strong> facing <strong>Daniel J. D'Arby</strong> in a server-authoritative 5-Card Draw poker showdown. D'Arby holds the souls of Jean Pierre Polnareff and Joseph Joestar as casino poker chips.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500 rounded-lg space-y-1">
                    <div className="font-arcade text-[9px] text-emerald-400">WIN CONDITION 1</div>
                    <div className="text-[11px] text-emerald-200">
                      Recover all 12 soul chips (6 Polnareff + 6 Joseph) by winning chip pots.
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500 rounded-lg space-y-1">
                    <div className="font-arcade text-[9px] text-emerald-400">WIN CONDITION 2</div>
                    <div className="text-[11px] text-emerald-200">
                      Break D'Arby's mind! Force 100% Paranoia and 0% Composure (Mental Collapse / Retires).
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-rose-950/40 border-2 border-rose-600 rounded-xl space-y-2">
                <h3 className="font-arcade text-[11px] text-rose-400 flex items-center gap-2">
                  <Skull size={14} className="text-rose-500" />
                  DEFEAT CONDITIONS & SUDDEN DEATH TABOO
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-rose-200 text-[11px]">
                  <li>
                    <strong>Bankruptcy:</strong> Losing all 6 of Jotaro's starting soul chips forfeits your Stand to Osiris.
                  </li>
                  <li>
                    <strong>Holly Kujo's Taboo (Sudden Death):</strong> If you pledge Holly Kujo's soul as collateral and lose even a single Holly chip, D'Arby claims her life immediately — instant defeat!
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: DEAL CHRONOLOGY & 5-SECOND SP QTE */}
          {activeTab === 'DEAL_QTE' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-black/80 border-2 border-purple-900 rounded-xl space-y-2">
                <h3 className="font-arcade text-[11px] text-amber-300 flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  THE 3-STEP CHRONOLOGICAL DEAL SEQUENCE
                </h3>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300 text-[11px]">
                  <li>
                    <strong>Step A (Pre-Deal Setup):</strong> Choose whether to play Normal (look at cards after deal) or Blind Hand (1.5x Paranoia multiplier). Then click <code>[START DEALING]</code>.
                  </li>
                  <li>
                    <strong>Step B (5.0s Dealing Animation & Star Platinum Window):</strong> 10 cards slide one by one from <code>THE DECK</code> to both sides face-down. D'Arby announces the deal. During these full 5.0 seconds, you can press <strong>[SPACEBAR]</strong> or click the pulsing button to activate Star Platinum!
                  </li>
                  <li>
                    <strong>Step C (Post-Deal Reveal):</strong> Only after the 5-second window finishes do cards flip face-up (or lock blind), and pre-draw betting begins.
                  </li>
                </ol>
              </div>

              <div className="p-3.5 bg-black/80 border-2 border-purple-900 rounded-xl space-y-2">
                <h3 className="font-arcade text-[11px] text-amber-300">
                  DUAL SPACEBAR CONTROLS & QTE NEEDLE TIMING
                </h3>
                <p className="text-slate-300">
                  Pressing <strong>[SPACE]</strong> during the deal activates Kinetic Perception. The QTE timing bar opens. Pressing <strong>[SPACE]</strong> (or clicking anywhere) while the needle sweeps across the bar freezes it instantly.
                </p>
                <div className="p-2.5 bg-purple-950/60 border border-purple-700 rounded-lg text-purple-200 text-[11px]">
                  <strong>Hit Sweet Spot:</strong> If D'Arby cheated (Bottom Deal or Second Deal), you expose it! You can snap your finger for a public accusation or stay silent to pocket the intel and invert his deck later.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TWO-WAY BLUFFING */}
          {activeTab === 'BLUFFING' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-black/80 border-2 border-purple-900 rounded-xl space-y-2">
                <h3 className="font-arcade text-[11px] text-amber-300 flex items-center gap-2">
                  <Flame size={14} className="text-rose-400" />
                  PLAYER BLUFF ACTION [😏 BLUFF RAISE]
                </h3>
                <p className="text-slate-300">
                  Once per hand during pre-draw or post-draw betting, click <code>[BLUFF RAISE (+1-2 Chips)]</code> to intimidate D'Arby.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500 rounded-lg space-y-1">
                    <div className="font-arcade text-[9px] text-emerald-400">HIGH SUCCESS CONDITIONS</div>
                    <div className="text-[11px] text-emerald-200">
                      If D'Arby's Paranoia &gt;= 45% OR you stood pat (discarded 0–1 cards), the bluff inflicts <strong>+18% Paranoia, -15% Composure</strong>, and can force D'Arby to FOLD!
                    </div>
                  </div>
                  <div className="p-3 bg-rose-950/60 border border-rose-500 rounded-lg space-y-1">
                    <div className="font-arcade text-[9px] text-rose-400">BACKFIRE RISK</div>
                    <div className="text-[11px] text-rose-200">
                      If you discarded 3 cards and bluff against a composed D'Arby (Composure &gt;= 70%), D'Arby reads your tell, gains +15% Composure, and re-raises you!
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-black/80 border-2 border-purple-900 rounded-xl space-y-2">
                <h3 className="font-arcade text-[11px] text-amber-300">
                  D'ARBY'S ACTIVE BLUFFING ("SNOWING")
                </h3>
                <p className="text-slate-300">
                  When D'Arby holds a weak hand (High Card or Low Pair), he will occasionally bet 2 chips claiming a monster hand.
                </p>
                <p className="text-purple-200 text-[11px]">
                  <strong>Visual Tell:</strong> An animated eye-twitch appears on his HUD, and consulting Muhammad Avdol will reveal an elevated Bluff Probability % (75%+). Hero-call his bluff to sweep the pot!
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM DATA STRUCTURES */}
          {activeTab === 'DATA_STRUCTURES' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {[
                {
                  name: 'RiggedDeckDeque (Doubly-Linked List)',
                  desc: 'Custom doubly linked list maintaining node pointers. Supports O(1) dealFair (head), dealBottom (tail), dealSecond (head.next), and starPlatinumTamper (pointer swap).'
                },
                {
                  name: 'SoulPotStack (LIFO Stack)',
                  desc: 'Physical Last-In First-Out chip stack. When Jotaro snaps D\'Arby\'s cheat, chips are refunded in reverse order to exact original owners.'
                },
                {
                  name: 'SoulVaultMap (O(1) Hash Map)',
                  desc: 'Hash map tracking balances of Jotaro, Polnareff, Joseph, Avdol, Kakyoin, and Holly across player bank, D\'Arby bank, and pot.'
                },
                {
                  name: 'DarbyBrainFSM & DecisionTree (Directed Graph FSM)',
                  desc: 'Finite state machine transitioning across 6 emotional states: SMUG, CALCULATING, GREEDY, SUSPICIOUS, PARANOID, and CATATONIC.'
                },
                {
                  name: 'IntelComboDAG (Directed Acyclic Graph)',
                  desc: 'Topologically sorted DAG calculating compound sanity multipliers from connected psychological triggers.'
                },
                {
                  name: 'PlayerPatternQueue (Circular Bounded Queue)',
                  desc: 'Bounded circular queue of capacity 6 that detects repetitive player actions and raises D\'Arby\'s threat immunity.'
                },
                {
                  name: 'PokerHandEvaluator (Binary Max-Heap)',
                  desc: '5-card poker evaluator with rank frequencies and a custom Max-Heap priority queue to resolve kicker tie-breaks in O(log N).'
                }
              ].map((ds, i) => (
                <div key={i} className="p-3 bg-black/80 border-2 border-purple-900 rounded-xl space-y-1">
                  <div className="font-arcade text-[10px] text-amber-300 flex items-center gap-1.5">
                    <Layers size={13} className="text-amber-400" />
                    <span>{ds.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{ds.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: STAND ABILITIES */}
          {activeTab === 'ABILITIES' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3.5 bg-black/80 border-2 border-purple-900 rounded-xl space-y-1.5">
                <div className="font-arcade text-[10px] text-amber-300">★ STAR PLATINUM DECK TAMPER</div>
                <p className="text-[11px] text-slate-300">
                  If you pocketed intel on D'Arby's cheat, you can swap the deck's pointers during the draw phase. The bad card he dealt himself goes to the discard pile, while his rigged top card goes to your hand!
                </p>
              </div>

              <div className="p-3.5 bg-black/80 border-2 border-purple-900 rounded-xl space-y-1.5">
                <div className="font-arcade text-[10px] text-amber-300">★ PHANTOM STUNT (+35 PARANOIA)</div>
                <p className="text-[11px] text-slate-300">
                  Available in post-draw betting when playing Blind. Star Platinum summons a cigarette and a drink unnoticed. D'Arby panics wondering if time was stopped right before his eyes!
                </p>
              </div>

              <div className="p-3.5 bg-black/80 border-2 border-purple-900 rounded-xl space-y-1.5">
                <div className="font-arcade text-[10px] text-rose-400">★ DEMAND DIO'S STAND SECRET (ALL-IN DEFICIT)</div>
                <p className="text-[11px] text-slate-300">
                  When you wager more chips than D'Arby possesses in his bank (Pot Deficit &gt; 0), you can demand the secret of DIO's Stand to cover the remainder of his bet. If his Paranoia is high, he collapses into catatonic shock!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-arcade text-[10px] uppercase tracking-widest border-2 border-black shadow-manga transition"
          >
            [CLOSE GAME MANUAL]
          </button>
        </div>
      </div>
    </div>
  );
};

