import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { pool, initDb, pingDb } from './db.js';

const app = express();

// ---------- CONFIG ----------

// Aceita frontend em desenvolvimento local e o deploy em Render.
// Em produção, define FRONTEND_ORIGIN nas variáveis de ambiente
// para uma URL específica (mais seguro que allow-all).
const allowedOrigins = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:3000',
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Permite tools como curl/Postman (sem header Origin)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Permite todos os subdomínios .onrender.com para os deploys de preview
    if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)) return cb(null, true);
    return cb(new Error(`CORS bloqueado: ${origin}`));
  }
}));

app.use(express.json({ limit: '10kb' })); // Testemunhos são pequenos

// Trust proxy — Render está atrás de load balancer, precisamos disto
// para o rate limiter identificar IPs correctamente.
app.set('trust proxy', 1);

// Rate limit para prevenir spam: 5 POSTs de testemunho por 10 min por IP
const testimonialPostLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Muitos testemunhos submetidos. Tenta novamente em 10 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ---------- ROUTES ----------

// Health check — Render usa isto para verificar se o serviço está vivo
app.get('/health', async (req, res) => {
  try {
    const dbTime = await pingDb();
    res.json({ status: 'ok', db: 'connected', db_time: dbTime, time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'error', error: err.message });
  }
});

// GET /api/testimonials — lista pública, mais recentes primeiro
app.get('/api/testimonials', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, place, story, created_at
       FROM testimonials
       ORDER BY created_at DESC
       LIMIT 200`
    );
    res.json({
      count: result.rows.length,
      testimonials: result.rows
    });
  } catch (err) {
    console.error('[GET testimonials]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /api/testimonials — submissão pública com rate limit
app.post('/api/testimonials', testimonialPostLimiter, async (req, res) => {
  const { name, place, story } = req.body || {};

  // Validação
  if (!story || typeof story !== 'string') {
    return res.status(400).json({ error: 'story_required' });
  }
  const cleanStory = story.trim().slice(0, 600);
  if (cleanStory.length < 3) {
    return res.status(400).json({ error: 'story_too_short' });
  }
  const cleanName = (typeof name === 'string' ? name.trim() : '').slice(0, 40) || null;
  const cleanPlace = (typeof place === 'string' ? place.trim() : '').slice(0, 80) || null;

  try {
    const result = await pool.query(
      `INSERT INTO testimonials (name, place, story)
       VALUES ($1, $2, $3)
       RETURNING id, name, place, story, created_at`,
      [cleanName, cleanPlace, cleanStory]
    );
    res.status(201).json({ testimonial: result.rows[0] });
  } catch (err) {
    console.error('[POST testimonials]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

// ---------- BOOT ----------

const port = Number(process.env.PORT) || 3000;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`[COSMOS-API] a ouvir em :${port}`);
      console.log(`[COSMOS-API] ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('[COSMOS-API] falha a arrancar:', err);
    process.exit(1);
  });
