#!/usr/bin/env node
/**
 * fetch-satellites.mjs — Atualiza data/satellites.json com contagens frescas do Celestrak
 *
 * Requer: Node 18+
 * Uso: node scripts/fetch-satellites.mjs
 * Celestrak é aberto e não requer chave.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'satellites.json');

// Celestrak groups: https://celestrak.org/NORAD/elements/index.php
const GROUPS = {
  starlink: 'starlink',
  oneweb: 'oneweb',
  iridium: 'iridium-NEXT'
};

async function countGroup(group) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
  console.log(`[SAT] A obter grupo ${group}…`);
  const res = await fetch(url, { headers: { 'User-Agent': 'COSMOS-almanaque/1.0' } });
  if (!res.ok) throw new Error(`Celestrak respondeu ${res.status} para ${group}`);
  const arr = await res.json();
  return Array.isArray(arr) ? arr.length : 0;
}

async function main() {
  const current = JSON.parse(await readFile(OUT, 'utf-8'));

  const starlinkCount = await countGroup(GROUPS.starlink);
  const onewebCount = await countGroup(GROUPS.oneweb);
  const iridiumCount = await countGroup(GROUPS.iridium);

  // Update in place — preserve other fields
  const consts = current.constellations;
  const findAndUpdate = (key, count) => {
    const c = consts.find(x => x.key === key);
    if (c && count > 0) c.count = count;
  };
  findAndUpdate('starlink', starlinkCount);
  findAndUpdate('oneweb', onewebCount);
  findAndUpdate('iridium', iridiumCount);

  // Recalculate percentages relative to sum
  const total = consts.reduce((s, c) => s + c.count, 0);
  consts.forEach(c => { c.pct = +(c.count / total * 100).toFixed(2); });

  // Update total (roughly: active is close to sum of constellations)
  current.totals.active = total;
  current._meta.updated = new Date().toISOString();

  await writeFile(OUT, JSON.stringify(current, null, 2) + '\n', 'utf-8');
  console.log(`[SAT] Gravado. Starlink=${starlinkCount}, OneWeb=${onewebCount}, Iridium=${iridiumCount}, Total=${total}`);
}

main().catch(err => { console.error('[SAT] Erro:', err); process.exit(1); });
