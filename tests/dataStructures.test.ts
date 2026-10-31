import { RiggedDeckDeque } from '../src/server/structures/RiggedDeckDeque.js';
import { SoulPotStack, SoulVaultMap } from '../src/server/structures/SoulStructures.js';
import { DarbyBrainFSM, DarbyDecisionTree } from '../src/server/structures/DarbyBrain.js';
import { IntelComboDAG } from '../src/server/structures/IntelComboDAG.js';
import { PlayerPatternQueue } from '../src/server/structures/PlayerPatternQueue.js';
import { PokerHandEvaluator, MaxHeap } from '../src/server/structures/PokerHandEvaluator.js';
import { GameEngine } from '../src/server/gameEngine.js';

console.log('--- RUNNING CUSTOM DATA STRUCTURES TEST SUITE ---');

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string) {
  if (cond) {
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${name}`);
    failed++;
  }
}

// 1. RiggedDeckDeque Tests
console.log('\n[1. Testing RiggedDeckDeque]');
const deck = new RiggedDeckDeque();
assert(deck.size === 52, 'Deck initializes with 52 cards');

const topCard = deck.dealFair();
assert(topCard !== null && deck.size === 51, 'dealFair() removes head in O(1)');

const bottomCard = deck.dealBottom();
assert(bottomCard !== null && deck.size === 50, 'dealBottom() removes tail in O(1)');

const secondCard = deck.dealSecond();
assert(secondCard !== null && deck.size === 49, 'dealSecond() removes head.next in O(1)');

const tampered = deck.starPlatinumTamper();
assert(tampered === true && deck.tampered === true, 'starPlatinumTamper() executes O(1) pointer swap between head and tail');

// Test sanitized telemetry masking (no card ID leak)
const deckTeleMasked = deck.toTelemetry(false);
assert(deckTeleMasked.headId === 'NODE_HEAD', 'DeckTelemetry masks head card ID as NODE_HEAD');
assert(deckTeleMasked.nodesTopology[0].id.startsWith('NODE_'), 'DeckTelemetry topology masks card IDs');

// 2. SoulPotStack & SoulVaultMap Tests
console.log('\n[2. Testing SoulPotStack & SoulVaultMap]');
const pot = new SoulPotStack();
const vault = new SoulVaultMap();

assert(vault.get('JOTARO').heldByPlayer === 6, 'Jotaro starts with 6 chips');
assert(vault.get('POLNAREFF').heldByDarby === 6, 'Polnareff starts with 6 chips held by D\'Arby');
assert(vault.get('JOSEPH').heldByDarby === 6, 'Joseph starts with 6 chips held by D\'Arby');

vault.pledgeToPot('JOTARO', 2, pot, 'TEST_BET', true);
assert(pot.size() === 2, 'Pledging pushes 2 chips onto SoulPotStack');
assert(vault.get('JOTARO').heldByPlayer === 4, 'Jotaro player balance decrements to 4');

// 1-for-1 match test: D'Arby matches 2 chips
const matched = vault.darbyMatchCall(2, pot, 'TEST_MATCH');
assert(matched === 2, 'D\'Arby matches 2 chips 1-for-1');
assert(pot.size() === 4, 'Pot size reflects both player and D\'Arby contributions (4 chips)');

// Test LIFO reverse order refund
vault.refundPot(pot);
assert(pot.isEmpty(), 'SoulPotStack is empty after refund');
assert(vault.get('JOTARO').heldByPlayer === 6, 'LIFO refund restored Jotaro chips to exact owner');
assert(vault.get('POLNAREFF').heldByDarby === 6, 'LIFO refund restored D\'Arby chips to exact owner');

// D'Arby keeps every lost player chip and wagers captured chips before his original souls.
vault.pledgeToPot('JOTARO', 2, pot, 'TEST_LOSS', true);
vault.pledgeToPot('AVDOL', 1, pot, 'TEST_LOSS', true);
vault.awardPot('DARBY', pot);
assert(vault.getDarbyTotalBank() === 15, 'D\'Arby bank grows beyond 12 when he captures player chips');
assert(vault.get('JOTARO').heldByDarby === 2, 'D\'Arby bank tracks captured Jotaro chips');
assert(vault.get('AVDOL').heldByDarby === 1, 'D\'Arby bank tracks captured companion chips');

const fullTransferVault = new SoulVaultMap();
const fullTransferPot = new SoulPotStack();
fullTransferVault.pledgeToPot('JOTARO', 2, fullTransferPot, 'TEST_LOSS', true);
fullTransferVault.darbyMatchCall(2, fullTransferPot, 'TEST_LOSS');
fullTransferVault.awardPot('DARBY', fullTransferPot);
assert(fullTransferVault.getDarbyTotalBank() === 14, 'D\'Arby receives every chip in the pot, including his own bets');
assert(fullTransferVault.get('POLNAREFF').heldByDarby === 6, 'D\'Arby\'s own Polnareff chips remain in his bank after winning');

const foldEngine = new GameEngine();
foldEngine.phase = 'PRE_DRAW_BETTING';
foldEngine.playerFold();
assert(foldEngine.soulVault.get('JOTARO').heldByDarby === 1, 'Jotaro-folded chips transfer to D\'Arby');
assert(foldEngine.soulVault.getDarbyTotalBank() === 13, 'D\'Arby bank total updates after Jotaro folds');

const capturedChipsPot = new SoulPotStack();
const capturedChipsMatched = vault.darbyMatchCall(3, capturedChipsPot, 'TEST_REBET');
const capturedBetOwners = capturedChipsPot.toTelemetry().potChips.map(chip => chip.owner);
assert(capturedChipsMatched === 3, 'D\'Arby can wager captured chips from his bank');
assert(
  capturedBetOwners.join(',') === 'JOTARO,JOTARO,AVDOL',
  'D\'Arby spends captured chips first in LIFO order'
);
vault.awardPot('PLAYER', capturedChipsPot);
assert(vault.get('JOTARO').heldByPlayer === 6, 'Jotaro can win captured Jotaro chips back');
assert(vault.get('JOTARO').wagerableByPlayer === 6, 'Won Jotaro chips return to the active wagerable bank');
assert(vault.get('AVDOL').heldByPlayer === 6, 'Jotaro can win captured companion chips back');
assert(vault.get('AVDOL').wagerableByPlayer === 1, 'Won Avdol chips return to the active wagerable bank');

const liberatedVault = new SoulVaultMap();
const liberatedPot = new SoulPotStack();
liberatedVault.darbyMatchCall(1, liberatedPot, 'TEST_LIBERATION');
liberatedVault.awardPot('PLAYER', liberatedPot);
assert(liberatedVault.get('POLNAREFF').heldByPlayer === 1, 'Polnareff chips won by Jotaro enter liberated souls');
assert(liberatedVault.get('POLNAREFF').wagerableByPlayer === 0, 'Liberated Polnareff chips remain protected from betting');

const victoryEngine = new GameEngine();
victoryEngine.soulVault.clearDarbyBank('POLNAREFF');
victoryEngine.soulVault.clearDarbyBank('JOSEPH');
victoryEngine.checkVictoryConditions();
assert(victoryEngine.phase === 'VICTORY', 'Jotaro wins when D\'Arby\'s entire bank reaches zero');

// Test True Pot Deficit calculation:
// If player contributes 3 chips and D'Arby has 12 chips in reserve, deficit is negative (3 - 12 = -9)
vault.pledgeToPot('JOTARO', 3, pot, 'BET', true);
const def1 = vault.calculatePotDeficit(pot);
assert(def1 < 0, `Pot deficit is negative when D'Arby has ample chips (deficit: ${def1})`);
vault.refundPot(pot);

// Test Liquidity Gate on Soul Vault:
// Avdol & Kakyoin locked when Jotaro chips > 2 and facing 0 bet
assert(vault.canPledge('AVDOL', 0).allowed === false, 'Liquidity Gate blocks Avdol when Jotaro has 6 active chips');
assert(vault.canPledge('KAKYOIN', 0).allowed === false, 'Liquidity Gate blocks Kakyoin when Jotaro has 6 active chips');
assert(vault.canPledge('HOLLY', 0).allowed === false, 'Ultimate Taboo blocks Holly when other companion souls are safe');

// Drain Jotaro chips to 2 -> Avdol & Kakyoin become unlocked
vault.get('JOTARO').heldByPlayer = 2;
assert(vault.canPledge('AVDOL', 0).allowed === true, 'Liquidity Gate unlocks Avdol when Jotaro active chips <= 2');
assert(vault.canPledge('KAKYOIN', 0).allowed === true, 'Liquidity Gate unlocks Kakyoin when Jotaro active chips <= 2');

// Reset Jotaro chips
vault.get('JOTARO').heldByPlayer = 6;

const lastResortVault = new SoulVaultMap();
assert(lastResortVault.canPledge('HOLLY', 0).allowed === false, 'Holly stays locked at match start');
lastResortVault.get('AVDOL').heldByPlayer = 0;
lastResortVault.get('AVDOL').heldByDarby = 6;
lastResortVault.get('KAKYOIN').heldByPlayer = 0;
lastResortVault.get('KAKYOIN').heldByDarby = 6;
assert(
  lastResortVault.canPledge('HOLLY', 0).allowed === false,
  'Holly remains locked while Jotaro has active wagerable chips'
);
lastResortVault.get('JOTARO').heldByPlayer = 0;
lastResortVault.get('JOTARO').wagerableByPlayer = 0;
lastResortVault.get('POLNAREFF').heldByPlayer = 6;
lastResortVault.get('JOSEPH').heldByPlayer = 6;
assert(
  lastResortVault.getPlayerWagerableChips() === 0 &&
    lastResortVault.canPledge('HOLLY', 0).allowed,
  'Holly unlocks only after Jotaro, Avdol, and Kakyoin lose their chips; liberated souls do not count'
);
lastResortVault.get('KAKYOIN').heldByDarby = 5;
lastResortVault.get('KAKYOIN').inPot = 1;
assert(
  lastResortVault.canPledge('HOLLY', 0).allowed === false,
  'Holly stays locked while a Kakyoin chip is still in the pot'
);

// Test Buffs/Debuffs calculation
vault.get('HOLLY').inPot = 1;
const vaultTele = vault.toTelemetry();
assert(vaultTele.isHollyInPot === true, 'Holly in pot activates Taboo Multiplier');
assert(vaultTele.activeBuffs.some(b => b.includes('Taboo Multiplier')), 'Telemetry reflects 1.6x taboo multiplier');
vault.get('HOLLY').inPot = 0;

// 3. DarbyBrain FSM & DecisionTree Tests
console.log('\n[3. Testing DarbyBrain FSM & DecisionTree]');
const fsm = new DarbyBrainFSM();
assert(fsm.getState() === 'SMUG', 'Initial FSM state is SMUG');

fsm.transition('CALCULATING', 'Evaluating odds');
assert(fsm.getState() === 'CALCULATING', 'FSM transitions along valid directed edge to CALCULATING');

// Test Bidirectional edges & GREEDY state
fsm.transition('GREEDY', 'Preying on bluff');
assert(fsm.getState() === 'GREEDY', 'FSM supports transition to GREEDY state');

fsm.transition('CATATONIC', 'Mental breakdown');
assert(fsm.getState() === 'CATATONIC', 'FSM transitions to CATATONIC');

// Can transition BACK from CATATONIC (no dead-ends)
fsm.transition('CALCULATING', 'Regained composure');
assert(fsm.getState() === 'CALCULATING', 'FSM supports bidirectional recovery from CATATONIC');

const tree = new DarbyDecisionTree();

// Outcome 1: Refusal / Bet Capped (potDeficit < 6 AND paranoia < 75)
const out1 = tree.evaluateDioDemand({
  potDeficit: 4,
  rawBaseParanoia: 20,
  effectiveParanoia: 20,
  effectiveComposure: 80,
  isBlindHand: false,
  activeDAGNodeCount: 1,
  threatImmunity: 0,
  hollyPledged: false,
  hasPocketedIntel: false,
  hasPhantomStunt: false
});
assert(out1.outcomeNumber === 1, 'Outcome 1 (Refusal / Bet Capped) triggered when potDeficit < 6 and Paranoia < 75');

// Outcome 3: Catatonic Collapse (potDeficit >= 6, isBlindHand, Paranoia >= 90, Composure <= 10, activeDAGNodeCount >= 4)
const out3 = tree.evaluateDioDemand({
  potDeficit: 8,
  rawBaseParanoia: 80,
  effectiveParanoia: 95,
  effectiveComposure: 5,
  isBlindHand: true,
  activeDAGNodeCount: 4,
  threatImmunity: 0,
  hollyPledged: true,
  hasPocketedIntel: true,
  hasPhantomStunt: true
});
assert(out3.outcomeNumber === 3, 'Outcome 3 (Catatonic Collapse) triggered when potDeficit >= 6, BlindHand, Paranoia >= 90, Composure <= 10, DAG >= 4');

// Outcome 2: The Ruthless Call (potDeficit >= 6, but Paranoia < 90 or not blind)
const out2 = tree.evaluateDioDemand({
  potDeficit: 8,
  rawBaseParanoia: 50,
  effectiveParanoia: 55,
  effectiveComposure: 45,
  isBlindHand: false,
  activeDAGNodeCount: 2,
  threatImmunity: 0,
  hollyPledged: false,
  hasPocketedIntel: false,
  hasPhantomStunt: false
});
assert(out2.outcomeNumber === 2, 'Outcome 2 (The Ruthless Call) triggered on high deficit without catatonic conditions');

// 4. IntelComboDAG Tests
console.log('\n[4. Testing IntelComboDAG]');
const dag = new IntelComboDAG();
const topSort = dag.getTopologicalSort();
assert(topSort.length === 6, 'Topological sort contains all 6 tactical DAG vertices');
assert(topSort[0] === 'POCKETED_CHEAT_INTEL', 'First topological vertex is POCKETED_CHEAT_INTEL');

dag.activateNode('POCKETED_CHEAT_INTEL');
dag.activateNode('LOCKED_BLIND_HAND');
const combo = dag.calculateCompoundSanityMultiplier();
assert(combo.multiplier > 1.0, `Compound sanity multiplier correctly computed along DAG edge: ${combo.multiplier}x`);

// 5. PlayerPatternQueue Tests
console.log('\n[5. Testing PlayerPatternQueue]');
const queue = new PlayerPatternQueue();
for (let i = 0; i < 6; i++) {
  queue.enqueue('BLUFF_RAISE');
}
assert(queue.size() === 6, 'Circular queue reaches capacity 6');
const spam = queue.detectSpam();
assert(spam.action === 'BLUFF_RAISE' && spam.threatBonus > 0, 'Circular queue detects repetitive tactical spam');

queue.enqueue('BLIND_LOCK');
queue.enqueue('BLIND_LOCK');
assert(queue.countRecentAction('BLIND_LOCK', 3) === 2, 'countRecentAction correctly counts consecutive BLIND_LOCK actions');

// 6. PokerHandEvaluator Tests
console.log('\n[6. Testing PokerHandEvaluator & MaxHeap]');
const heap = new MaxHeap<number>((a, b) => a - b);
[7, 14, 2, 10, 13].forEach(v => heap.insert(v));
assert(heap.extractMax() === 14, 'MaxHeap extractMax() returns highest rank Ace (14)');
assert(heap.extractMax() === 13, 'MaxHeap extractMax() returns King (13)');

// Royal flush test
const royalFlush = [
  { id: '1', suit: 'SPADES' as const, rank: 'A' as const, value: 14 },
  { id: '2', suit: 'SPADES' as const, rank: 'K' as const, value: 13 },
  { id: '3', suit: 'SPADES' as const, rank: 'Q' as const, value: 12 },
  { id: '4', suit: 'SPADES' as const, rank: 'J' as const, value: 11 },
  { id: '5', suit: 'SPADES' as const, rank: '10' as const, value: 10 },
];
const evalRoyal = PokerHandEvaluator.evaluate(royalFlush);
assert(evalRoyal.category === 'ROYAL_FLUSH' && evalRoyal.categoryScore === 10, 'PokerHandEvaluator identifies Royal Flush');

// Four Kings test (D'Arby's signature hand)
const fourKings = [
  { id: '1', suit: 'SPADES' as const, rank: 'K' as const, value: 13 },
  { id: '2', suit: 'HEARTS' as const, rank: 'K' as const, value: 13 },
  { id: '3', suit: 'DIAMONDS' as const, rank: 'K' as const, value: 13 },
  { id: '4', suit: 'CLUBS' as const, rank: 'K' as const, value: 13 },
  { id: '5', suit: 'SPADES' as const, rank: '10' as const, value: 10 },
];
const evalKings = PokerHandEvaluator.evaluate(fourKings);
assert(evalKings.category === 'FOUR_OF_A_KIND' && evalKings.categoryScore === 8, 'PokerHandEvaluator identifies Four of a Kind');

// 7. Full Game Engine Server-Authoritative Sanitization Tests
console.log('\n[7. Testing GameEngine Server-Authoritative Sanitization]');
const engine = new GameEngine();
engine.setBlindChoice(true); // Choose blind hand

const clientState = engine.getSanitizedState();
assert(clientState.isBlindHand === true, 'Player selected Blind Hand');
assert(clientState.jotaroHand.every(c => c.suit === 'HIDDEN' && c.rank === '?'), 'CRITICAL RULE: Jotaro cards are strictly masked as HIDDEN on blind hand');
assert(clientState.darbyHand.every(c => c.suit === 'HIDDEN' && c.rank === '?'), 'CRITICAL RULE: D\'Arby hole cards are strictly masked as HIDDEN from client');
assert(clientState.jotaroHand.every(c => c.id.startsWith('HIDDEN_CARD_')), 'CRITICAL RULE: Jotaro card IDs are masked (no card ID leak)');
assert(clientState.darbyHand.every(c => c.id.startsWith('HIDDEN_CARD_')), 'CRITICAL RULE: D\'Arby card IDs are masked (no card ID leak)');

// 8. Dynamic Cheating & Voluntary Star Platinum Inspection Tests
console.log('\n[8. Testing Probabilistic Cheating & Star Platinum Deductive Utility]');

const mentalStateEngine = new GameEngine();
assert(
  mentalStateEngine.metrics.paranoia === 10 &&
    mentalStateEngine.metrics.composure === 90 &&
    mentalStateEngine.darbyFSM.getState() === 'SMUG',
  'A new match starts at 10% paranoia, 90% composure, and SMUG'
);
mentalStateEngine.setBlindChoice(true);
assert(
  mentalStateEngine.metrics.paranoia + mentalStateEngine.metrics.composure === 100,
  'Blind-hand modifiers preserve the inverse mental-state total'
);
mentalStateEngine.resetGame();
assert(
  mentalStateEngine.handNumber === 1 &&
    !mentalStateEngine.isBlindHand &&
    mentalStateEngine.metrics.paranoia === 10 &&
    mentalStateEngine.metrics.composure === 90 &&
    mentalStateEngine.darbyFSM.getState() === 'SMUG',
  'Match reset restores the Hand 1 mental-state defaults'
);

const soulPledgeEngine = new GameEngine();
soulPledgeEngine.phase = 'ACCUSATION_WINDOW';
soulPledgeEngine.recentCheatType = 'BOTTOM_DEAL';
soulPledgeEngine.soulVault.get('JOTARO').heldByPlayer = 2;
soulPledgeEngine.pocketIntel();

let paranoiaBeforePledge = soulPledgeEngine.metrics.paranoia;
soulPledgeEngine.pledgeSoul('AVDOL', 1);
assert(
  soulPledgeEngine.metrics.paranoia === paranoiaBeforePledge + 12 &&
    soulPledgeEngine.metrics.composure === 100 - soulPledgeEngine.metrics.paranoia,
  'Avdol pledge increases paranoia by 12% after pocketing cheat intel'
);

paranoiaBeforePledge = soulPledgeEngine.metrics.paranoia;
soulPledgeEngine.pledgeSoul('KAKYOIN', 1);
assert(
  soulPledgeEngine.metrics.paranoia === paranoiaBeforePledge + 18 &&
    soulPledgeEngine.metrics.composure === 100 - soulPledgeEngine.metrics.paranoia,
  'Kakyoin pledge increases paranoia by 18% after pocketing cheat intel'
);

const hollyPledgeEngine = new GameEngine();
hollyPledgeEngine.phase = 'PRE_DRAW_BETTING';
hollyPledgeEngine.soulVault.get('JOTARO').heldByPlayer = 0;
hollyPledgeEngine.soulVault.get('JOTARO').wagerableByPlayer = 0;
hollyPledgeEngine.soulVault.get('AVDOL').heldByPlayer = 0;
hollyPledgeEngine.soulVault.get('AVDOL').heldByDarby = 6;
hollyPledgeEngine.soulVault.get('KAKYOIN').heldByPlayer = 0;
hollyPledgeEngine.soulVault.get('KAKYOIN').heldByDarby = 6;
paranoiaBeforePledge = hollyPledgeEngine.metrics.paranoia;
hollyPledgeEngine.pledgeSoul('HOLLY', 1);
assert(
  hollyPledgeEngine.metrics.paranoia === paranoiaBeforePledge + 30 &&
    hollyPledgeEngine.metrics.composure === 100 - hollyPledgeEngine.metrics.paranoia,
  'Unlocked Holly pledge increases paranoia by 30% and preserves inverse composure'
);

const lifelineEngine = new GameEngine();
lifelineEngine.soulVault.refundPot(lifelineEngine.soulPot);
lifelineEngine.phase = 'BETWEEN_HANDS';
lifelineEngine.soulVault.get('JOTARO').heldByPlayer = 0;
lifelineEngine.soulVault.get('JOTARO').wagerableByPlayer = 0;
lifelineEngine.soulVault.get('AVDOL').heldByPlayer = 0;
lifelineEngine.soulVault.get('AVDOL').heldByDarby = 6;
lifelineEngine.soulVault.get('KAKYOIN').heldByPlayer = 0;
lifelineEngine.soulVault.get('KAKYOIN').heldByDarby = 6;
lifelineEngine.checkVictoryConditions();
assert(
  lifelineEngine.phase === 'BETWEEN_HANDS',
  'An empty active bank does not end the match while Holly remains in the vault'
);
lifelineEngine.nextHand();
assert(lifelineEngine.handNumber === 1, 'A depleted player cannot skip the forced vault pledge');
assert(lifelineEngine.pledgeSoul('HOLLY', 1) === 1, 'The last-resort Holly pledge is accepted between hands');
lifelineEngine.nextHand();
assert(
  lifelineEngine.handNumber === 2 && lifelineEngine.phase === 'BLIND_SELECTION',
  'Pledging a vault chip allows the next hand to begin'
);

const foldToVaultEngine = new GameEngine();
foldToVaultEngine.phase = 'PRE_DRAW_BETTING';
foldToVaultEngine.soulVault.get('JOTARO').heldByPlayer = 0;
foldToVaultEngine.soulVault.get('JOTARO').wagerableByPlayer = 0;
foldToVaultEngine.soulVault.get('AVDOL').heldByPlayer = 0;
foldToVaultEngine.soulVault.get('AVDOL').heldByDarby = 6;
foldToVaultEngine.soulVault.get('KAKYOIN').heldByPlayer = 0;
foldToVaultEngine.soulVault.get('KAKYOIN').heldByDarby = 6;
foldToVaultEngine.playerFold();
assert(
  foldToVaultEngine.phase === 'BETWEEN_HANDS',
  'Losing the last active chips transitions to the vault instead of premature defeat'
);

const blindPledgeEngine = new GameEngine();
blindPledgeEngine.setBlindChoice(true);
blindPledgeEngine.phase = 'PRE_DRAW_BETTING';
blindPledgeEngine.soulVault.get('JOTARO').heldByPlayer = 2;
paranoiaBeforePledge = blindPledgeEngine.metrics.paranoia;
blindPledgeEngine.pledgeSoul('AVDOL', 1);
assert(
  blindPledgeEngine.metrics.paranoia === paranoiaBeforePledge + 18 &&
    blindPledgeEngine.metrics.composure === 100 - blindPledgeEngine.metrics.paranoia,
  'Blind Avdol pledge applies the 1.5x paranoia boost'
);

// Test 8.1: Cheat Chance Calculations based on FSM & Metrics
const testEngine = new GameEngine();
testEngine.wasPreviouslyAccused = false;
testEngine.syncComposureAndParanoia(5);
assert(testEngine.calculateCheatChance() === 0.65, 'Cheat chance is 65% when Composure > 70 and Paranoia < 30');

testEngine.syncComposureAndParanoia(25);
assert(testEngine.calculateCheatChance() === 0.45, 'Base cheat chance is 45%');

testEngine.wasPreviouslyAccused = true;
assert(testEngine.calculateCheatChance() === 0.20, 'Cheat chance drops to 20% when previously accused');

testEngine.dealer = 'DEALER BOY';
assert(testEngine.calculateCheatChance() === 0, 'Dealer boy cheat chance is 0% (always fair)');

// Test 8.2: Voluntary Dealing: Player skips inspection (0 charges consumed, transitions to PRE_DRAW_BETTING)
const skipEngine = new GameEngine();
skipEngine.starPlatinumCharges = 3;
skipEngine.setBlindChoice(false);
assert(skipEngine.phase === 'DEALING', 'Phase transitions to DEALING after blind choice');
skipEngine.skipInspect();
assert(skipEngine.phase === 'PRE_DRAW_BETTING', 'skipInspect() transitions cleanly to PRE_DRAW_BETTING (New Street!)');
assert(skipEngine.starPlatinumCharges === 3, 'skipInspect() consumes 0 Star Platinum charges');

// Test 8.3: Star Platinum Inspection: Case A (D'Arby Cheated)
const cheatInspectEngine = new GameEngine();
cheatInspectEngine.starPlatinumCharges = 3;
cheatInspectEngine.setBlindChoice(false);
cheatInspectEngine.recentCheatType = 'BOTTOM_DEAL';
cheatInspectEngine.lastBottomDealtCard = { id: 'A_SPADES', suit: 'SPADES', rank: 'A', value: 14 };
cheatInspectEngine.spObserve(true); // Sweet spot HIT
assert(cheatInspectEngine.starPlatinumCharges === 2, 'SP inspection consumes 1 charge');
assert((cheatInspectEngine.phase as string) === 'ACCUSATION_WINDOW', 'Detecting cheat opens ACCUSATION_WINDOW');
// Dialogue is now D'Arby's in-character reaction; actionReport carries the SP cheat alert
assert(
  cheatInspectEngine.actionReport !== null && cheatInspectEngine.actionReport.type === 'CHEAT_BOTTOM',
  'Case A dialogue displays Bottom Deal detected'
);

// Test 8.4: Star Platinum Inspection: Case B (D'Arby Dealt Fair)
const fairInspectEngine = new GameEngine();
fairInspectEngine.starPlatinumCharges = 3;
fairInspectEngine.setBlindChoice(false);
fairInspectEngine.recentCheatType = 'NONE';
fairInspectEngine.isBaiting = false;
fairInspectEngine.spObserve(true);
assert(fairInspectEngine.starPlatinumCharges === 2, 'Fair deal inspection consumes 1 charge');
assert((fairInspectEngine.phase as string) === 'PRE_DRAW_BETTING', 'Fair deal inspection proceeds to PRE_DRAW_BETTING without accusation');
// actionReport carries the "clean" message; D'Arby's dialogue is now in-character
assert(
  fairInspectEngine.actionReport !== null && fairInspectEngine.actionReport.type === 'CLEAN',
  'Case B dialogue displays: Deal was completely clean.'
);
assert(fairInspectEngine.hasPocketedIntel === false, 'No pocketed intel on fair deal');

// Test 8.5: Star Platinum Inspection: Twitch Tell (Missed Sweet Spot)
const missInspectEngine = new GameEngine();
missInspectEngine.starPlatinumCharges = 3;
missInspectEngine.setBlindChoice(false);
missInspectEngine.syncComposureAndParanoia(40);
missInspectEngine.recentCheatType = 'BOTTOM_DEAL';
missInspectEngine.spObserve(false);
assert(missInspectEngine.starPlatinumCharges === 2, 'Missed SP observation consumes 1 charge');
assert(missInspectEngine.metrics.composure === 65, 'Missed observation gives D\'Arby +15 Composure (Twitch Tell)');
assert(
  missInspectEngine.metrics.paranoia + missInspectEngine.metrics.composure === 100,
  'Missed observation keeps paranoia and composure synchronized'
);
assert((missInspectEngine.phase as string) === 'PRE_DRAW_BETTING', 'Missed observation proceeds to PRE_DRAW_BETTING');

// Test 8.6: Star Platinum Inspection: Twitch Tell (Triggering when D'Arby baits)
const baitInspectEngine = new GameEngine();
baitInspectEngine.starPlatinumCharges = 3;
baitInspectEngine.syncComposureAndParanoia(40);
baitInspectEngine.phase = 'DEALING';
baitInspectEngine.recentCheatType = 'NONE';
baitInspectEngine.isBaiting = true;
baitInspectEngine.spObserve(true);
assert(baitInspectEngine.metrics.composure === 65, 'Bait trigger gives D\'Arby +15 Composure (Twitch Tell)');
assert(
  baitInspectEngine.metrics.paranoia + baitInspectEngine.metrics.composure === 100,
  'Bait trigger keeps paranoia and composure synchronized'
);
assert(baitInspectEngine.dialogue.text.includes('Twitch Tell!'), 'Bait trigger produces Twitch Tell dialogue');

// 9. 5-Card Draw Poker Street Progression & D'Arby Intelligent Discard
console.log('\n[9. Testing 5-Card Draw Poker Street Progression & D\'Arby Discard]');
const pokerEngine = new GameEngine();
pokerEngine.setBlindChoice(false);
pokerEngine.skipInspect();
assert(pokerEngine.phase === 'PRE_DRAW_BETTING', 'Opening street is PRE_DRAW_BETTING');

// Pre-Draw: Check (and match call if D'Arby bet/bluffed) -> advances to DRAW_PHASE
pokerEngine.playerCheck();
if (pokerEngine.toCall > 0) {
  pokerEngine.playerCall();
}
assert(pokerEngine.phase === 'DRAW_PHASE', 'Checking/matching pre-draw advances phase to DRAW_PHASE');

// Jotaro discards 2 cards -> D'Arby discards with strategy -> advances to POST_DRAW_BETTING
pokerEngine.discardCards([0, 2]);
assert(pokerEngine.phase === 'POST_DRAW_BETTING', 'Confirm Draw advances phase explicitly to POST_DRAW_BETTING');
assert(pokerEngine.authoritativeJotaroHand.length === 5, 'Jotaro hand maintains 5 cards after draw');
assert(pokerEngine.darbyDiscardCount >= 0 && pokerEngine.darbyDiscardCount <= 3, 'D\'Arby discards 0 to 3 cards based on poker evaluation');
assert(pokerEngine.actionFeed.some(f => f.includes('Draw Street:')), 'Action feed logs Draw Street discards');

// Avdol Advice test
const advice = pokerEngine.getAvdolAdvice();
assert(advice.available === true, 'Avdol Strategic Advice is available when Avdol soul is safe');
assert(advice.adviceText.length > 0, 'Avdol provides strategic advice based on D\'Arby discard count');

// Check in post-draw betting (and match call if D'Arby bet) advances to SHOWDOWN
pokerEngine.playerCheck();
if (pokerEngine.toCall > 0) {
  pokerEngine.playerCall();
}
assert(pokerEngine.phase === 'SHOWDOWN', 'Checking/matching in POST_DRAW_BETTING advances phase to SHOWDOWN');
assert(pokerEngine.showdownResult !== null, 'showdownResult populated');

// 10. Star Platinum Deck Tamper Single-Use
console.log('\n[10. Testing Star Platinum Deck Tamper]');
const tamperEngine = new GameEngine();
tamperEngine.phase = 'DRAW_PHASE';
tamperEngine.hasPocketedIntel = true;
tamperEngine.starPlatinumCharges = 3;
assert(tamperEngine.hasTamperedThisHand === false, 'hasTamperedThisHand starts false');
assert(tamperEngine.getSanitizedState().canTamper === true, 'canTamper is true before tampering');

const tamperSuccess1 = tamperEngine.spTamper();
assert(tamperSuccess1 === true, 'First spTamper() returns true');
assert(tamperEngine.starPlatinumCharges === 2, 'spTamper() deducts exactly 1 SP Charge');
assert(tamperEngine.hasTamperedThisHand === true, 'hasTamperedThisHand flag is set to true');
assert(tamperEngine.getSanitizedState().canTamper === false, 'canTamper becomes false once tampered');

const tamperSuccess2 = tamperEngine.spTamper();
assert(tamperSuccess2 === false, 'Second spTamper() in same hand returns false');
assert(tamperEngine.starPlatinumCharges === 2, 'Second spTamper() does not drain additional SP charges');

console.log(`\n===========================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`===========================================\n`);

if (failed > 0) process.exit(1);
