import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { GameEngine } from './gameEngine.js';
import { SoulOwner } from './structures/SoulStructures.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend assets if built
const distDir = path.resolve(import.meta.dirname, '../../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// In-memory server-authoritative session game engine
const gameEngine = new GameEngine();

app.get('/api/game/state', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: gameEngine.getSanitizedState()
  });
});

app.post('/api/game/draw', (req: Request, res: Response) => {
  try {
    const indices: number[] = req.body?.indices || [];
    gameEngine.discardCards(indices);
    res.json({
      success: true,
      data: gameEngine.getSanitizedState()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Draw failed' });
  }
});

app.post('/api/game/action', (req: Request, res: Response) => {
  const { action, payload } = req.body;

  try {
    switch (action) {
      case 'NEW_GAME':
        gameEngine.resetGame();
        break;

      case 'NEXT_HAND':
        gameEngine.nextHand();
        break;

      case 'BLIND_TOGGLE':
        gameEngine.setBlindChoice(!!payload?.isBlind);
        break;

      case 'SKIP_INSPECT':
      case 'FINISH_DEALING':
        gameEngine.skipInspect();
        break;

      case 'SP_OBSERVE':
        gameEngine.spObserve(!!payload?.hitCheat);
        break;

      case 'PUBLIC_ACCUSE':
        gameEngine.publicAccuse();
        break;

      case 'POCKET_INTEL':
        gameEngine.pocketIntel();
        break;

      case 'DRAW':
      case 'DISCARD':
        gameEngine.discardCards(payload?.indices || []);
        break;

      case 'SP_TAMPER':
        gameEngine.spTamper();
        break;

      case 'SP_PHANTOM_STUNT':
        gameEngine.spPhantomStunt();
        break;

      case 'PLEDGE_SOUL':
        gameEngine.pledgeSoul(payload?.owner as SoulOwner, payload?.amount || 1);
        break;

      case 'BET_RAISE':
        gameEngine.playerRaise(payload?.amount || 1);
        break;

      case 'BLUFF_RAISE':
      case 'PLAYER_BLUFF':
        gameEngine.playerBluff(payload?.amount || 1);
        break;

      case 'CHECK':
        gameEngine.playerCheck();
        break;

      case 'CALL':
        gameEngine.playerCall();
        break;

      case 'FOLD':
        gameEngine.playerFold();
        break;

      case 'DEMAND_DIO_SECRET':
        gameEngine.demandDioSecret();
        break;

      default:
        res.status(400).json({ success: false, error: `Unknown action: ${action}` });
        return;
    }

    res.json({
      success: true,
      data: gameEngine.getSanitizedState()
    });
  } catch (err: any) {
    console.error('Action error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
});

// SPA fallback (Express 5 compatible)
if (fs.existsSync(distDir)) {
  app.use((req: Request, res: Response) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[SOUL GAMBLE BACKEND] Server-authoritative engine running at http://localhost:${PORT}`);
});
