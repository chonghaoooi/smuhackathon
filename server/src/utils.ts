import { randomUUID } from 'node:crypto';

export const id = () => randomUUID();

export function clampPrice(price: number) {
  return Math.max(1, Math.round(price));
}
