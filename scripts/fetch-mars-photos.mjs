#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const OUT = join(DATA_DIR, 'mars-photos.json');

const KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

async function latestPhoto(rover) {
  const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${KEY}`;
  console.log(`[MARS] A obter últimas fotos do ${rover}…`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[MARS] ${rover}: API respondeu ${res.status} — a saltar`);
      return null;
    }
    const data = await res.json();
    const photos = data.latest_photos || [];
    if (photos.length === 0) return null;
    const preferred = photos.find(p =>
      ['MAST', 'MASTCAM', 'MCZ_LEFT', 'MCZ_RIGHT', 'NAVCAM_LEFT', 'NAVCAM_RIGHT'].includes(p.camera?.name)
    );
    return preferred || photos[0];
  } catch (err) {
    console.warn(`[MARS] ${rover}: erro — a saltar (${err.message})`);
    return null;
  }
}

async function main() {
  const perseverance = await latestPhoto('perseverance');
  const curiosity = await latestPhoto('curiosity');

  const output = {
    _meta: {
      updated: new Date().toISOString(),
      source: 'NASA Mars Photos API',
      note: 'Últimas fotos disponíveis dos rovers em Marte. Atualizado diariamente.'
    },
    perseverance: perseverance ? {
      latest_photo_url: perseverance.img_src,
      sol: perseverance.sol,
      earth_date: perseverance.earth_date,
      camera: perseverance.camera?.full_name || perseverance.camera?.name
    } : null,
    curiosity: curiosity ? {
      latest_photo_url: curiosity.img_src,
      sol: curiosity.sol,
      earth_date: curiosity.earth_date,
      camera: curiosity.camera?.full_name || curiosity.camera?.name
    } : null
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUT, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`[MARS] Gravado. Perseverance sol=${perseverance?.sol || 'null'}, Curiosity sol=${curiosity?.sol || 'null'}`);
}

main().catch(err => { console.error('[MARS] Erro fatal:', err); process.exit(1); });
