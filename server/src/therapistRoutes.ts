import { Router } from 'express';
import { verifyToken } from './auth.js';
import { analyzeTeam } from './therapist/engine.js';
import { generateNarrative } from './therapist/llm.js';

type Auth = { sub: string; role: 'team' | 'admin' };

function authFromReq(req: any): Auth | null {
  const token = String(req.headers.authorization ?? '').replace('Bearer ', '');
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function createTherapistApi() {
  const router = Router();

  router.get('/me', async (req, res) => {
    const auth = authFromReq(req);
    if (!auth || auth.role !== 'team') return res.status(401).json({ error: 'Unauthorized' });

    const engineResult = analyzeTeam(auth.sub);
    const narrative = await generateNarrative(engineResult);
    res.json({ ...engineResult, narrative });
  });

  return router;
}
