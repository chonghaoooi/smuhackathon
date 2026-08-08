import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { config } from './config.js';
import { bootDb, isFirstRun } from './bootstrap.js';
import { db } from './db.js';
import { createApi } from './routes.js';

bootDb();

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: true } });

app.use('/api', createApi(io));
app.get('/api/health', (_req, res) => {
  const market = db.prepare('SELECT * FROM market_settings WHERE id = 1').get();
  res.json({ ok: true, firstRun: isFirstRun(), market });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error(err);
  res.status(500).json({ error: message });
});

io.on('connection', (socket) => {
  socket.emit('connection-status', { state: 'connected' });
});

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${config.port}`);
});
