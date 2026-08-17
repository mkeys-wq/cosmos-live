#!/usr/bin/env node
/**
 * update-missions.mjs — Atualiza os campos "live" das missões
 *
 * Voyager 1 e 2 afastam-se da Terra a velocidades conhecidas.
 * Este script calcula as distâncias atuais por interpolação linear
 * a partir de posições de referência confirmadas.
 *
 * Se data/mars-photos.json foi atualizado hoje, integra a foto na
 * missão Perseverance/Curiosity.
 *
 * Uso: node scripts/update-missions.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MISSIONS = join(__dirname, '..', 'data', 'missions.json');
const MARS = join(__dirname, '..', 'data', 'mars-photos.json');

// Velocidades de afastamento (relativas ao Sol; aproximação boa o suficiente para distância à Terra)
const VOYAGER1 = { ref_date: '2026-01-01T00:00:00Z', ref_km: 24_570_000_000, speed_kms: 17.0 };
const VOYAGER2 = { ref_date: '2026-01-01T00:00:00Z', ref_km: 20_440_000_000, speed_kms: 15.4 };

function extrapolate(ref) {
  const refT = new Date(ref.ref_date).getTime();
  const now = Date.now();
  const elapsedSec = (now - refT) / 1000;
  return Math.round(ref.ref_km + ref.speed_kms * elapsedSec);
}

async function main() {
  const missions = JSON.parse(await readFile(MISSIONS, 'utf-8'));

  // Voyager distances
  const voyager = missions.missions.find(m => m.id === 'voyager');
  if (voyager) {
    const v1 = extrapolate(VOYAGER1);
    const v2 = extrapolate(VOYAGER2);
    voyager.live = { voyager1_km: v1, voyager2_km: v2, updated: new Date().toISOString() };
    // Update display data too
    const fmt = km => (km / 1e9).toFixed(1) + ' mil M km';
    voyager.data = [['V1', fmt(v1)], ['V2', fmt(v2)]];
    console.log(`[MISS] Voyager 1: ${fmt(v1)}, Voyager 2: ${fmt(v2)}`);
  }

  // Integrate Mars photos if available
  try {
    const mars = JSON.parse(await readFile(MARS, 'utf-8'));
    const perseverance = missions.missions.find(m => m.id === 'perseverance');
    if (perseverance && mars.perseverance?.latest_photo_url) {
      perseverance.image_url = mars.perseverance.latest_photo_url;
      perseverance.image_credit = `NASA/JPL-Caltech · Sol ${mars.perseverance.sol} · ${mars.perseverance.camera}`;
      console.log(`[MISS] Perseverance photo: sol ${mars.perseverance.sol}`);
    }
    const curiosity = missions.missions.find(m => m.id === 'curiosity');
    if (curiosity && mars.curiosity?.latest_photo_url) {
      curiosity.image_url = mars.curiosity.latest_photo_url;
      curiosity.image_credit = `NASA/JPL-Caltech · Sol ${mars.curiosity.sol} · ${mars.curiosity.camera}`;
      console.log(`[MISS] Curiosity photo: sol ${mars.curiosity.sol}`);
    }
  } catch { /* mars file may not exist yet */ }

  // Update meta
  missions._meta.updated = new Date().toISOString();

  await writeFile(MISSIONS, JSON.stringify(missions, null, 2) + '\n', 'utf-8');
  console.log('[MISS] Gravado missions.json');
}

main().catch(err => { console.error('[MISS] Erro:', err); process.exit(1); });
