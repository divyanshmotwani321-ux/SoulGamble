export type DarbyFSMState = 'SMUG' | 'CALCULATING' | 'GREEDY' | 'SUSPICIOUS' | 'PARANOID' | 'CATATONIC';

export interface DarbyMetrics {
  rawBaseParanoia: number; // 10..100 (starts at 10, permanent changes only)
  paranoia: number;        // 0..100 (effective current turn paranoia)
  composure: number;       // 0..100 (always 100 - paranoia)
  suspicion: number;       // 0..100
  greed: number;           // 0..100
  threatImmunity: number;  // Increments by +15 per repetitive action, +30 on repeated blind play
  stuntSucceeded: boolean;
  cheatExposed: boolean;
  dioDemandChargesUsed: number;
}

export interface FSMTransitionRecord {
  from: DarbyFSMState;
  to: DarbyFSMState;
  trigger: string;
  timestamp: number;
}

export interface DioDemandEvaluation {
  outcomeNumber: 1 | 2 | 3;
  outcomeName: string;
  dialogue: string;
  potDeficit: number;
  effectiveParanoia: number;
  effectiveComposure: number;
  isBlindHand: boolean;
  decisionPath: string[];
  refusalBypassable?: boolean;
}

export interface DarbyBrainTelemetry {
  currentState: DarbyFSMState;
  availableTransitions: DarbyFSMState[];
  metrics: DarbyMetrics;
  recentTransitions: FSMTransitionRecord[];
  lastDecisionTrace: string[];
  dealerState: 'DARBY_DEALS' | 'DEALER_BOY';
  dialogueQuote: string;
}

/**
 * Directed Graph Finite State Machine for D'Arby's psychological state.
 * Fully bidirectional across all states to prevent dead-ends.
 */
export class DarbyBrainFSM {
  private state: DarbyFSMState = 'SMUG';
  private transitionHistory: FSMTransitionRecord[] = [];
  private adjacencyList: Map<DarbyFSMState, Set<DarbyFSMState>> = new Map();

  constructor() {
    this.buildGraph();
  }

  private buildGraph(): void {
    const states: DarbyFSMState[] = ['SMUG', 'CALCULATING', 'GREEDY', 'SUSPICIOUS', 'PARANOID', 'CATATONIC'];
    for (const s of states) {
      this.adjacencyList.set(s, new Set());
    }

    // Connect fully bidirectional directed edges between all psychological states
    for (const from of states) {
      for (const to of states) {
        if (from !== to) {
          this.addEdge(from, to);
        }
      }
    }
  }

  private addEdge(from: DarbyFSMState, to: DarbyFSMState): void {
    this.adjacencyList.get(from)?.add(to);
  }

  public getState(): DarbyFSMState {
    return this.state;
  }

  public canTransitionTo(target: DarbyFSMState): boolean {
    return this.adjacencyList.get(this.state)?.has(target) || false;
  }

  public transition(target: DarbyFSMState, reason: string): boolean {
    if (this.state === target) return true;
    if (this.canTransitionTo(target)) {
      this.transitionHistory.push({
        from: this.state,
        to: target,
        trigger: reason,
        timestamp: Date.now()
      });
      this.state = target;
      return true;
    }
    return false;
  }

  public forceTransition(target: DarbyFSMState, reason: string): void {
    if (this.state === target) return;
    this.transitionHistory.push({
      from: this.state,
      to: target,
      trigger: reason,
      timestamp: Date.now()
    });
    this.state = target;
  }

  public resetState(state: DarbyFSMState = 'SMUG'): void {
    this.state = state;
    this.transitionHistory = [];
  }

  /**
   * Dynamically transition D'Arby's FSM state based on Paranoia & Greed:
   * Greed Trigger: GREEDY (holds >= trips or preys on unearned player bluff)
   * 0-24%: SMUG
   * 25-49%: CALCULATING
   * 50-69%: SUSPICIOUS
   * 70-89%: PARANOID
   * 90-100%: CATATONIC (Breakdown threshold)
   */
  public evaluateFSM(
    metrics: DarbyMetrics,
    options?: { isGreedyTriggered?: boolean }
  ): DarbyFSMState {
    const p = Math.min(100, Math.max(0, metrics.paranoia));
    let target: DarbyFSMState;

    if (options?.isGreedyTriggered || (metrics.greed >= 65 && p < 50)) {
      target = 'GREEDY';
    } else if (p >= 90) {
      target = 'CATATONIC';
    } else if (p >= 70) {
      target = 'PARANOID';
    } else if (p >= 50) {
      target = 'SUSPICIOUS';
    } else if (p >= 25) {
      target = 'CALCULATING';
    } else {
      target = 'SMUG';
    }

    if (this.state !== target) {
      this.forceTransition(target, `Psych State Evaluated at Paranoia ${p}%`);
    }
    return this.state;
  }

  public getTransitions(): DarbyFSMState[] {
    return Array.from(this.adjacencyList.get(this.state) || []);
  }

  public getHistory(): FSMTransitionRecord[] {
    return [...this.transitionHistory];
  }
}

/**
 * DarbyDecisionTree: Evaluates bets and the "DEMAND DIO'S SECRET" gambit
 * by traversing hierarchical decision nodes.
 */
export class DarbyDecisionTree {
  private lastTrace: string[] = [];

  public getTrace(): string[] {
    return [...this.lastTrace];
  }

  /**
   * Evaluate the high-stakes "DEMAND DIO'S SECRET" mechanic
   */
  public evaluateDioDemand(params: {
    potDeficit: number;
    rawBaseParanoia: number;
    effectiveParanoia: number;
    effectiveComposure: number;
    isBlindHand: boolean;
    activeDAGNodeCount: number;
    threatImmunity: number;
    hollyPledged: boolean;
    hasPocketedIntel: boolean;
    hasPhantomStunt: boolean;
  }): DioDemandEvaluation {
    const trace: string[] = [];
    const {
      potDeficit,
      rawBaseParanoia,
      effectiveParanoia,
      effectiveComposure,
      isBlindHand,
      activeDAGNodeCount,
      threatImmunity
    } = params;

    trace.push(`Node 1 [Paranoia Baseline]: rawBase(${rawBaseParanoia}) -> turnEffective(${effectiveParanoia}%), composure(${effectiveComposure}%)`);
    trace.push(`Node 2 [Pot Deficit Check]: potDeficit = ${potDeficit} (Player contribution exceeds D'Arby max possible contribution)`);
    trace.push(`Node 3 [DAG & Threat Context]: activeDAGNodes = ${activeDAGNodeCount}, threatImmunity = ${threatImmunity}, isBlind = ${isBlindHand}`);

    // Outcome 3 (Catatonic Collapse — Psychological Victory):
    // Requires potDeficit >= 6, isBlindHand === true, darbyParanoia >= 90, darbyComposure <= 10, and >= 4 active nodes in IntelComboDAG
    if (
      potDeficit >= 6 &&
      isBlindHand &&
      effectiveParanoia >= 90 &&
      effectiveComposure <= 10 &&
      activeDAGNodeCount >= 4
    ) {
      trace.push('-> Branch: potDeficit >= 6 && isBlindHand && Paranoia >= 90 && Composure <= 10 && DAG >= 4 -> OUTCOME 3 (Catatonic Collapse)');
      this.lastTrace = trace;
      return {
        outcomeNumber: 3,
        outcomeName: 'Catatonic Collapse',
        dialogue: '"C-C-C-CALL?! I CANNOT SAY IT! If I lose... Lord DIO will tear my flesh into ribbons! How can you wager your own mother\'s soul WITHOUT EVEN GLANCING AT YOUR HAND?! ...GAAAHHHH!"',
        potDeficit,
        effectiveParanoia,
        effectiveComposure,
        isBlindHand,
        decisionPath: trace
      };
    }

    // Outcome 1 (Refusal / Bet Capped):
    // If potDeficit < 6 AND darbyParanoia < 75: D'Arby refuses to wager DIO's secret, caps pot at his All-In chip count, and forces card Showdown.
    if (potDeficit < 6 && effectiveParanoia < 75) {
      trace.push('-> Branch: potDeficit < 6 && Paranoia < 75 -> OUTCOME 1 (Refusal / Bet Capped)');
      this.lastTrace = trace;
      return {
        outcomeNumber: 1,
        outcomeName: 'Refusal / Bet Capped',
        dialogue: '"I refuse! To speak Lord DIO\'s secret is certain death! I shall cap this wager at my physical chips alone... Show me your cards, Jotaro!"',
        potDeficit,
        effectiveParanoia,
        effectiveComposure,
        isBlindHand,
        decisionPath: trace,
        refusalBypassable: false
      };
    }

    // Outcome 2 (The Ruthless Call — Live Showdown):
    // If potDeficit >= 6, darbyParanoia < 90 (or !isBlindHand or threatImmunity >= 30)
    trace.push('-> Branch: potDeficit >= 6 (Paranoia < 90 or !isBlind or threatImmunity >= 30) -> OUTCOME 2 (The Ruthless Call)');
    this.lastTrace = trace;
    return {
      outcomeNumber: 2,
      outcomeName: 'The Ruthless Call',
      dialogue: '"You boast bravely, Jotaro, but my hand is UNBEATABLE! I put DIO\'s secret on the line and scream: I CALL! SHOW ME YOUR CARDS!"',
      potDeficit,
      effectiveParanoia,
      effectiveComposure,
      isBlindHand,
      decisionPath: trace
    };
  }
}
