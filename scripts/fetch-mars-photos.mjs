#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'mars-photos.json');

const KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

async function latestPhoto(rover) {
  const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${KEY}`;
  console.log(`[MARS] A obter últimas fotos do ${rover}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mars Photos API respondeu ${res.status} para ${rover}`);
  const data = await res.json();
  const photos = data.latest_photos || [];
  if (photos.length === 0) return null;
  const preferred = photos.find(p =>
    ['MAST', 'MASTCAM', 'MCZ_LEFT', 'MCZ_RIGHT', 'NAVCAM_LEFT', 'NAVCAM_RIGHT'].includes(p.camera?.name)
  );
  return preferred || photos[0];
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

  await writeFile(OUT, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`[MARS] Perseverance sol ${perseverance?.sol}, Curiosity sol ${curiosity?.sol}`);
}

main().catch(err => { console.error('[MARS] Erro:', err); process.exit(1); });
