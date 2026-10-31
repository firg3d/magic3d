/** Wrapper Node pentru export3mf: scrie arhiva pe disc (folosit de CLI). */
import { writeFileSync } from 'node:fs';
import { build3MF, Body } from './export3mf.js';

export async function export3MF(bodies: Body[], filepath: string): Promise<{ bytes: number; objects: number }> {
  const bytes = await build3MF(bodies);
  writeFileSync(filepath, bytes);
  return { bytes: bytes.length, objects: bodies.length };
}
