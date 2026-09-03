#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const OUT = join(DATA_DIR, 'apod.json');

const KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const URL = `https://api.nasa.gov/planetary/apod?api_key=${KEY}`;

async function main() {
  console.log('[APOD] A obter imagem astronómica do dia…');
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`APOD API respondeu ${res.status}`);
  const data = await res.json();

  const output = {
    _meta: {
      updated: new Date().toISOString(),
      source: 'NASA APOD (daily)',
      note: 'Atualizado por scripts/fetch-apod.mjs via GitHub Action diária.'
    },
    date: data.date,
    title: data.title,
    url: data.url,
    hdurl: data.hdurl || data.url,
    explanation: data.explanation,
    media_type: data.media_type,
    copyright: data.copyright || null
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUT, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`[APOD] Gravado: ${data.title} (${data.date})`);
}

main().catch(err => { console.error('[APOD] Erro:', err); process.exit(1); });
