import { createHash } from 'node:crypto';
import { config } from '../config.js';
import type { EngineResult } from './types.js';

export interface Narrative {
  roast: string;
  serious: string;
  available: boolean;
  source: 'llm' | 'fallback';
  error: string | null;
}

const SYSTEM_PROMPT = `You are Portfolio Therapist, a behavioural-finance communication layer.

You will receive a JSON object of structured behavioural findings already computed by a
deterministic analytics engine. Use ONLY the facts in that JSON.

Rules:
- Do not recommend buying or selling any security.
- Do not judge whether the investor is "good" or "bad".
- Do not invent trades, prices, or behaviour not present in the findings.
- Do not present any finding as a medical or psychological diagnosis.
- Phrase pattern-based findings (e.g. averaging down) as "possible X behaviour", never as fact.
- Produce two versions of the same explanation:
  1. roast: playful, exaggerated, still strictly grounded in the supplied findings.
  2. serious: neutral, behavioural-finance framing of the same findings.
Call the provide_therapist_narrative tool with both fields. Keep each under ~120 words.`;

const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { hash: string; narrative: Narrative; expiresAt: number }>();

function hashPayload(payload: unknown): string {
  return createHash('sha1').update(JSON.stringify(payload)).digest('hex');
}

function fallbackNarrative(engineResult: EngineResult, error: string | null): Narrative {
  const top = [...engineResult.findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
  const text = top
    ? `LLM narrative unavailable. Top signal: ${top.severity} severity ${top.type.replace(/_/g, ' ').toLowerCase()}${
        top.ticker ? ` on ${top.ticker}` : ''
      }.`
    : 'LLM narrative unavailable. No significant behavioural findings were detected yet.';
  return { roast: text, serious: text, available: false, source: 'fallback', error };
}

function severityRank(severity: string): number {
  return severity === 'HIGH' ? 2 : severity === 'MEDIUM' ? 1 : 0;
}

export async function generateNarrative(engineResult: EngineResult): Promise<Narrative> {
  const payload = { scores: engineResult.scores, findings: engineResult.findings };
  const hash = hashPayload(payload);
  const cached = cache.get(engineResult.meta.teamId);
  if (cached && cached.hash === hash && cached.expiresAt > Date.now()) {
    return cached.narrative;
  }

  if (!config.geminiApiKey) {
    return fallbackNarrative(engineResult, 'LLM not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
        tools: [
          {
            functionDeclarations: [
              {
                name: 'provide_therapist_narrative',
                description: 'Provide the roast-mode and serious-mode explanations of the supplied findings.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    roast: { type: 'STRING' },
                    serious: { type: 'STRING' }
                  },
                  required: ['roast', 'serious']
                }
              }
            ]
          }
        ],
        tool_config: { function_calling_config: { mode: 'ANY', allowed_function_names: ['provide_therapist_narrative'] } }
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return fallbackNarrative(engineResult, `Gemini API error ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { functionCall?: { name?: string; args?: { roast?: string; serious?: string } } }[] } }[];
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const call = parts.find((part) => part.functionCall?.name === 'provide_therapist_narrative')?.functionCall;
    const roast = call?.args?.roast;
    const serious = call?.args?.serious;
    if (!roast || !serious) {
      return fallbackNarrative(engineResult, 'Malformed LLM response');
    }

    const narrative: Narrative = { roast, serious, available: true, source: 'llm', error: null };
    cache.set(engineResult.meta.teamId, { hash, narrative, expiresAt: Date.now() + CACHE_TTL_MS });
    return narrative;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown LLM error';
    return fallbackNarrative(engineResult, message);
  } finally {
    clearTimeout(timeout);
  }
}
