import React, { useState } from 'react';
import { SanitizedGameState } from '../server/gameEngine.js';
import {
  Layers,
  Database,
  GitBranch,
  Network,
  RotateCcw,
  BarChart3,
  X,
  ChevronRight,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  telemetry: SanitizedGameState['dsTelemetry'];
}

type TabKey = 'DECK' | 'SOULS' | 'DARBY_FSM' | 'INTEL_DAG' | 'PATTERN_QUEUE' | 'POKER_HEAP';

export const DataStructuresDrawer: React.FC<Props> = ({ isOpen, onClose, telemetry }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('DECK');

  if (!isOpen) return null;

  const { deck, soulPot, soulVault, darbyBrain, intelDAG, patternQueue } = telemetry;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#0d0717]/95 backdrop-blur-xl border-l border-amber-500/30 shadow-2xl flex flex-col text-slate-200 transition-all">
      {/* Header */}
      <div className="p-4 border-b border-purple-900/40 flex items-center justify-between bg-purple-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold">
            DS
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-300 font-serif-display">
              Live Data Structures Telemetry
            </h2>
            <p className="text-xs text-slate-400">
              University Evaluation Panel • Server-Authoritative State
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-6 border-b border-purple-900/30 bg-purple-950/20 text-xs">
        <button
          onClick={() => setActiveTab('DECK')}
          className={`py-3 px-2 flex flex-col items-center gap-1 transition ${
            activeTab === 'DECK'
              ? 'bg-purple-900/50 text-amber-300 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={16} />
          <span>Deck Deque</span>
        </button>
        <button
          onClick={() => setActiveTab('SOULS')}
          className={`py-3 px-2 flex flex-col items-center gap-1 transition ${
            activeTab === 'SOULS'
              ? 'bg-purple-900/50 text-amber-300 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database size={16} />
          <span>Soul Vault</span>
        </button>
        <button
          onClick={() => setActiveTab('DARBY_FSM')}
          className={`py-3 px-2 flex flex-col items-center gap-1 transition ${
            activeTab === 'DARBY_FSM'
              ? 'bg-purple-900/50 text-amber-300 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch size={16} />
          <span>D'Arby FSM</span>
        </button>
        <button
          onClick={() => setActiveTab('INTEL_DAG')}
          className={`py-3 px-2 flex flex-col items-center gap-1 transition ${
            activeTab === 'INTEL_DAG'
              ? 'bg-purple-900/50 text-amber-300 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network size={16} />
          <span>Intel DAG</span>
        </button>
        <button
          onClick={() => setActiveTab('PATTERN_QUEUE')}
          className={`py-3 px-2 flex flex-col items-center gap-1 transition ${
            activeTab === 'PATTERN_QUEUE'
              ? 'bg-purple-900/50 text-amber-300 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <RotateCcw size={16} />
          <span>Ring Queue</span>
        </button>
        <button
          onClick={() => setActiveTab('POKER_HEAP')}
          className={`py-3 px-2 flex flex-col items-center gap-1 transition ${
            activeTab === 'POKER_HEAP'
              ? 'bg-purple-900/50 text-amber-300 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 size={16} />
          <span>Poker Heap</span>
        </button>
      </div>

      {/* Main Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* =========================================================
            TAB 1: RiggedDeckDeque
            ========================================================= */}
        {activeTab === 'DECK' && (
          <div className="space-y-4">
            <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-1">
                RiggedDeckDeque (Doubly Linked List / Deque)
              </h3>
              <p className="text-xs text-slate-300 mb-3">
                Maintains $O(1)$ deal pointer operations: <code className="text-amber-400 font-mono">dealFair()</code> at <span className="text-emerald-400">head</span>, <code className="text-amber-400 font-mono">dealBottom()</code> at <span className="text-rose-400">tail</span>, and <code className="text-amber-400 font-mono">dealSecond()</code>.
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-black/40 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">TOTAL SIZE</div>
                  <div className="text-lg font-bold text-amber-400">{deck.size}</div>
                </div>
                <div className="bg-black/40 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">HEAD NODE</div>
                  <div className="text-xs font-mono text-emerald-400 truncate">{deck.headId || 'NULL'}</div>
                </div>
                <div className="bg-black/40 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">TAIL NODE</div>
                  <div className="text-xs font-mono text-rose-400 truncate">{deck.tailId || 'NULL'}</div>
                </div>
                <div className="bg-black/40 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">TAMPERED</div>
                  <div className={`text-xs font-bold ${deck.tampered ? 'text-amber-400' : 'text-slate-500'}`}>
                    {deck.tampered ? 'YES (SWAPPED)' : 'NO'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Deque Pointer Topology Visualization</span>
                <span className="text-[11px] text-amber-400/80">Redacted for Server-Authoritative Security</span>
              </h4>
              <div className="space-y-2">
                {deck.nodesTopology.map((n, idx) => (
                  <div
                    key={n.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono border ${
                      n.position === 'HEAD'
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : n.position === 'TAIL'
                        ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                        : n.position === 'SECOND'
                        ? 'bg-sky-950/40 border-sky-500/50 text-sky-300'
                        : 'bg-black/30 border-purple-900/30 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                        {n.position}
                      </span>
                      <span>CardNode [{n.id}]</span>
                      {n.isMarked && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px]">
                          MARKED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>prev: {n.prevId || 'null'}</span>
                      <ChevronRight size={12} className="text-slate-600" />
                      <span>next: {n.nextId || 'null'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: SoulPotStack & SoulVaultMap
            ========================================================= */}
        {activeTab === 'SOULS' && (
          <div className="space-y-5">
            {/* SoulPotStack */}
            <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>SoulPotStack (LIFO Stack)</span>
                <span className="text-xs font-normal text-slate-400">
                  Size: {soulPot.stackSize} Chips
                </span>
              </h3>
              <p className="text-xs text-slate-300 mb-3">
                Wagers are pushed onto the stack. A Public Accusation pops chips in exact reverse LIFO order.
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 bg-black/40 p-2.5 rounded-lg border border-slate-800">
                {soulPot.potChips.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">Pot is empty</div>
                ) : (
                  [...soulPot.potChips].reverse().map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded bg-purple-950/60 border border-purple-800/40 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">#{soulPot.stackSize - i}</span>
                        <span className="text-slate-200">{c.id}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        Pledged: {c.pledgedAtPhase}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SoulVaultMap */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                SoulVaultMap (HashMap of 6 Soul States)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {soulVault.vaultEntries.map(entry => (
                  <div
                    key={entry.owner}
                    className="p-3 rounded-xl bg-black/40 border border-purple-900/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-300">{entry.name}</span>
                      <span className="text-xs font-mono text-slate-400">
                        {entry.heldByPlayer + entry.heldByDarby + entry.inPot}/6
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-300">
                        Player: {entry.heldByPlayer}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-500/30 text-rose-300">
                        D'Arby: {entry.heldByDarby}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/30 text-amber-300">
                        Pot: {entry.inPot}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-tight">
                      <p className="text-emerald-400/90">{entry.buffDescription}</p>
                      <p className="text-rose-400/90 mt-1">{entry.penaltyDescription}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Buffs & Debuffs */}
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Active Mechanical Effects</h4>
              <div className="space-y-1">
                {soulVault.activeBuffs.map((b, i) => (
                  <div key={i} className="text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={13} />
                    <span>{b}</span>
                  </div>
                ))}
                {soulVault.activeDebuffs.map((d, i) => (
                  <div key={i} className="text-xs text-rose-400 flex items-center gap-2">
                    <AlertCircle size={13} />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: DarbyBrain FSM & DecisionTree
            ========================================================= */}
        {activeTab === 'DARBY_FSM' && (
          <div className="space-y-5">
            <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  DarbyBrain Directed FSM
                </h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                  CURRENT: {darbyBrain.currentState}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                FSM Vertices: SMUG &rarr; CALCULATING &rarr; GREEDY &rarr; SUSPICIOUS &rarr; PARANOID &rarr; CATATONIC.
              </p>

              {/* FSM Graph Nodes */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {(['SMUG', 'CALCULATING', 'GREEDY', 'SUSPICIOUS', 'PARANOID', 'CATATONIC'] as const).map(st => {
                  const isActive = darbyBrain.currentState === st;
                  return (
                    <div
                      key={st}
                      className={`p-2.5 rounded-lg border font-mono transition ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-lg shadow-amber-500/10'
                          : 'bg-black/30 border-purple-900/30 text-slate-400'
                      }`}
                    >
                      {st}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metrics */}
            <div className="p-4 rounded-xl bg-black/40 border border-purple-900/40 space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Psychological Metrics</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Composure</span>
                    <span className="font-bold text-emerald-400">{darbyBrain.metrics.composure}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${darbyBrain.metrics.composure}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Paranoia</span>
                    <span className="font-bold text-rose-400">{darbyBrain.metrics.paranoia}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{ width: `${darbyBrain.metrics.paranoia}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Suspicion</span>
                    <span className="font-bold text-amber-400">{darbyBrain.metrics.suspicion}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${darbyBrain.metrics.suspicion}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Threat Immunity</span>
                    <span className="font-bold text-purple-400">+{darbyBrain.metrics.threatImmunity}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, darbyBrain.metrics.threatImmunity)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Tree Trace */}
            <div className="p-4 rounded-xl bg-black/40 border border-purple-900/40 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                DecisionTree Execution Trace (DIO Demand)
              </h4>
              <div className="space-y-1 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto bg-slate-950/60 p-2.5 rounded-lg">
                {darbyBrain.lastDecisionTrace.length === 0 ? (
                  <div className="text-slate-500">No DIO Demand evaluated yet in this match.</div>
                ) : (
                  darbyBrain.lastDecisionTrace.map((t, idx) => (
                    <div key={idx} className="text-emerald-400/90">{t}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: IntelComboDAG
            ========================================================= */}
        {activeTab === 'INTEL_DAG' && (
          <div className="space-y-5">
            <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  IntelComboDAG (Directed Acyclic Graph)
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
                  Multiplier: {intelDAG.compoundSanityMultiplier}x
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Topological traversal of tactical actions inflicts compound sanity-damage.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300">DAG Vertices & Active Paths</h4>
              <div className="space-y-2">
                {intelDAG.nodes.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-xs transition ${
                      n.isActive
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                        : 'bg-black/30 border-purple-900/30 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{n.label}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        n.isActive ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {n.isActive ? 'ACTIVE' : 'INACTIVE'} (Weight +{n.weight})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{n.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-purple-900/40 text-xs font-mono space-y-1">
              <div className="text-slate-400 text-[10px]">TOPOLOGICAL SORT ORDER (Kahn's Algorithm):</div>
              <div className="text-amber-300">{intelDAG.topologicalSort.join(' → ')}</div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 5: PlayerPatternQueue
            ========================================================= */}
        {activeTab === 'PATTERN_QUEUE' && (
          <div className="space-y-5">
            <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                PlayerPatternQueue (Bounded Circular Ring Buffer)
              </h3>
              <p className="text-xs text-slate-300">
                Fixed capacity of 6. Detects repetitive tactical spam to increase D'Arby's threat immunity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-purple-900/40 space-y-4">
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-mono">
                {patternQueue.buffer.map((item, idx) => {
                  const isHead = patternQueue.headIndex === idx;
                  const isTail = patternQueue.tailIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center min-h-[70px] ${
                        item
                          ? 'bg-purple-950/60 border-purple-700/50 text-amber-300'
                          : 'bg-slate-900/30 border-slate-800 text-slate-600'
                      }`}
                    >
                      <div className="text-[9px] text-slate-500 mb-1">
                        [{idx}] {isHead ? 'HEAD' : ''} {isTail ? 'TAIL' : ''}
                      </div>
                      <div className="font-bold text-[10px] truncate max-w-full">
                        {item || 'EMPTY'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {patternQueue.detectedSpamAction && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span>
                    Spam Detected on <strong className="font-mono">{patternQueue.detectedSpamAction}</strong>! Threat Immunity increased by +{patternQueue.threatImmunityBonus}.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 6: PokerHandEvaluator & Heap
            ========================================================= */}
        {activeTab === 'POKER_HEAP' && (
          <div className="space-y-5">
            <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                PokerHandEvaluator (Frequency Hash + Max-Heap)
              </h3>
              <p className="text-xs text-slate-300">
                Ranks 5-card hands using rank frequency buckets and resolves exact kicker tie-breakers using a priority queue / binary max-heap.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-purple-900/40 space-y-3 text-xs">
              <h4 className="font-bold text-amber-400 uppercase tracking-wider">Hand Hierarchy Ranks</h4>
              <div className="space-y-1 font-mono text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>10. Royal Flush</span>
                  <span className="text-amber-400">A-K-Q-J-10 Suited</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>8. Four of a Kind</span>
                  <span className="text-amber-400">D'Arby's Rigged Bottom Deal</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>7. Full House</span>
                  <span className="text-amber-400">Three of a kind + Pair</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>6. Flush / 5. Straight</span>
                  <span className="text-amber-400">5 suited / 5 in sequence</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>1. High Card</span>
                  <span className="text-slate-400">Resolved via Max-Heap Kickers</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
