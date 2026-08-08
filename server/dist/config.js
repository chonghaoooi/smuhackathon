import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config();
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const config = {
    port: Number(process.env.PORT ?? 4000),
    jwtSecret: process.env.JWT_SECRET ?? 'cashbux-dev-secret',
    databasePath: process.env.DATABASE_PATH ?? path.join(serverRoot, 'data', 'cashbux.db'),
    clientOrigin: process.env.CLIENT_ORIGIN ?? '*',
    backupDir: process.env.BACKUP_DIR ?? path.resolve(serverRoot, '..', 'backups'),
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? '',
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'
};
