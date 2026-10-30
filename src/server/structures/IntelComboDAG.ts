export type ComboNodeId =
  | 'POCKETED_CHEAT_INTEL'
  | 'LOCKED_BLIND_HAND'
  | 'ZERO_CARDS_DISCARDED'
  | 'PLEDGED_TABOO_SOUL'
  | 'SP_PHANTOM_STUNT'
  | 'DEMAND_DIO_SECRET';

export interface DAGNode {
  id: ComboNodeId;
  label: string;
  description: string;
  weight: number;
  isActive: boolean;
}

export interface DAGEdge {
  from: ComboNodeId;
  to: ComboNodeId;
  bonusMultiplier: number;
}

export interface DAGTelemetry {
  nodes: DAGNode[];
  edges: DAGEdge[];
  activePath: ComboNodeId[];
  topologicalSort: ComboNodeId[];
  compoundSanityMultiplier: number;
  totalPsychologicalDamage: number;
}

/**
 * IntelComboDAG: Directed Acyclic Graph that tracks chained psychological
 * actions and calculates topological compound sanity-damage multipliers.
 */
export class IntelComboDAG {
  private nodes: Map<ComboNodeId, DAGNode> = new Map();
  private edges: DAGEdge[] = [];
  private adjacency: Map<ComboNodeId, ComboNodeId[]> = new Map();
  private inDegree: Map<ComboNodeId, number> = new Map();

  constructor() {
    this.buildGraph();
  }

  private buildGraph(): void {
    // 1. Initialize vertices
    const nodeList: DAGNode[] = [
      {
        id: 'POCKETED_CHEAT_INTEL',
        label: 'Pocketed Cheat Intel',
        description: 'Caught D\'Arby\'s bottom-deal but stayed silent to exploit it later.',
        weight: 15,
        isActive: false
      },
      {
        id: 'LOCKED_BLIND_HAND',
        label: 'Locked Blind Hand',
        description: 'Playing without looking at hole cards. Denies D\'Arby micro-expressions.',
        weight: 20,
        isActive: false
      },
      {
        id: 'ZERO_CARDS_DISCARDED',
        label: 'Zero Cards Discarded',
        description: 'Drawing 0 cards blind implies absolute supreme confidence in deal.',
        weight: 15,
        isActive: false
      },
      {
        id: 'PLEDGED_TABOO_SOUL',
        label: 'Pledged Taboo Soul',
        description: 'Wagered Holly Kujo\'s soul chip into the pot as collateral.',
        weight: 30,
        isActive: false
      },
      {
        id: 'SP_PHANTOM_STUNT',
        label: 'Star Platinum Phantom Stunt',
        description: 'Lit cigarette or poured juice in 0.1s without visible movement.',
        weight: 25,
        isActive: false
      },
      {
        id: 'DEMAND_DIO_SECRET',
        label: 'Demand DIO\'s Secret',
        description: 'Demanded D\'Arby wager DIO\'s Stand secret to match the pot deficit.',
        weight: 35,
        isActive: false
      }
    ];

    for (const n of nodeList) {
      this.nodes.set(n.id, n);
      this.adjacency.set(n.id, []);
      this.inDegree.set(n.id, 0);
    }

    // 2. Add Directed Acyclic Edges
    this.addEdge('POCKETED_CHEAT_INTEL', 'LOCKED_BLIND_HAND', 1.25);
    this.addEdge('POCKETED_CHEAT_INTEL', 'SP_PHANTOM_STUNT', 1.30);
    this.addEdge('LOCKED_BLIND_HAND', 'ZERO_CARDS_DISCARDED', 1.35);
    this.addEdge('LOCKED_BLIND_HAND', 'PLEDGED_TABOO_SOUL', 1.40);
    this.addEdge('ZERO_CARDS_DISCARDED', 'SP_PHANTOM_STUNT', 1.25);
    this.addEdge('PLEDGED_TABOO_SOUL', 'SP_PHANTOM_STUNT', 1.50);
    this.addEdge('SP_PHANTOM_STUNT', 'DEMAND_DIO_SECRET', 1.60);
    this.addEdge('PLEDGED_TABOO_SOUL', 'DEMAND_DIO_SECRET', 1.45);
  }

  private addEdge(from: ComboNodeId, to: ComboNodeId, bonusMultiplier: number): void {
    this.edges.push({ from, to, bonusMultiplier });
    this.adjacency.get(from)?.push(to);
    this.inDegree.set(to, (this.inDegree.get(to) || 0) + 1);
  }

  public activateNode(id: ComboNodeId): void {
    const node = this.nodes.get(id);
    if (node) {
      node.isActive = true;
    }
  }

  public deactivateNode(id: ComboNodeId): void {
    const node = this.nodes.get(id);
    if (node) {
      node.isActive = false;
    }
  }

  public isNodeActive(id: ComboNodeId): boolean {
    return this.nodes.get(id)?.isActive || false;
  }

  public resetHand(): void {
    for (const n of this.nodes.values()) {
      // Pocketed cheat intel persists across current hand, others reset
      if (n.id !== 'POCKETED_CHEAT_INTEL') {
        n.isActive = false;
      }
    }
  }

  public resetAll(): void {
    for (const n of this.nodes.values()) {
      n.isActive = false;
    }
  }

  /**
   * Kahn's Algorithm for Topological Sort: O(V + E)
   */
  public getTopologicalSort(): ComboNodeId[] {
    const inDeg = new Map(this.inDegree);
    const queue: ComboNodeId[] = [];
    const result: ComboNodeId[] = [];

    for (const [id, deg] of inDeg.entries()) {
      if (deg === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      result.push(curr);
      const neighbors = this.adjacency.get(curr) || [];
      for (const next of neighbors) {
        const nextDeg = (inDeg.get(next) || 1) - 1;
        inDeg.set(next, nextDeg);
        if (nextDeg === 0) queue.push(next);
      }
    }

    return result;
  }

  /**
   * Traverses active DAG edges to compute the compound psychological multiplier
   */
  public calculateCompoundSanityMultiplier(): { multiplier: number; damage: number } {
    let multiplier = 1.0;
    let baseDamage = 0;

    // Sum weights of all active nodes
    for (const n of this.nodes.values()) {
      if (n.isActive) {
        baseDamage += n.weight;
      }
    }

    // Multiply along each active directed edge (from.isActive && to.isActive)
    for (const edge of this.edges) {
      const fromNode = this.nodes.get(edge.from);
      const toNode = this.nodes.get(edge.to);
      if (fromNode?.isActive && toNode?.isActive) {
        multiplier *= edge.bonusMultiplier;
      }
    }

    // Cap compound multiplier at 3.5x
    multiplier = Math.min(3.5, Math.round(multiplier * 100) / 100);
    const totalDamage = Math.round(baseDamage * multiplier);

    return { multiplier, damage: totalDamage };
  }

  public toTelemetry(): DAGTelemetry {
    const { multiplier, damage } = this.calculateCompoundSanityMultiplier();
    const activePath = Array.from(this.nodes.values())
      .filter(n => n.isActive)
      .map(n => n.id);

    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
      activePath,
      topologicalSort: this.getTopologicalSort(),
      compoundSanityMultiplier: multiplier,
      totalPsychologicalDamage: damage
    };
  }
}
