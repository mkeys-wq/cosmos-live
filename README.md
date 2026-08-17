# COSMOS — Almanaque Celeste

Um almanaque de eventos cósmicos em português. Site estático que se atualiza sozinho
através de GitHub Actions. Sem servidor, sem custos.

## O que se atualiza sozinho

| Dado | Frequência | Fonte |
|------|-----------|-------|
| **APOD** (imagem astronómica do dia) | Diária | NASA APOD API |
| **Fotos de Marte** (Perseverance, Curiosity) | Diária | NASA Mars Photos API |
| **Distâncias das Voyager 1 & 2** | Diária (cálculo local) | Extrapolação linear |
| **Contagem de Starlink / OneWeb / Iridium** | Semanal | Celestrak |
| **Posição da ISS** | Cada 5 segundos (browser) | wheretheiss.at |
| **Fase da Lua** | Contínua (cálculo local) | Efeméride astronómica |
| **Lista de eventos astronómicos** | Manual, revisão anual | NASA Eclipse tables + IMO |
| **Missões, locais de observação** | Manual | Edição direta dos JSON |

A honestidade obriga a dizer isto: **grande parte do conteúdo astronómico não muda
em "tempo real"**. Eclipses são previstos com décadas de antecedência. Chuvas de
meteoros ocorrem nas mesmas datas todos os anos. O que muda com o dia são as
fotos, as posições dos objetos móveis, e ocasionalmente contagens (satélites).
Este sistema foi desenhado para atualizar o que faz sentido atualizar.

---

## Arquitetura

```
                ┌─────────────────────────────┐
                │  index.html (frontend)      │
                │  · fetches /data/*.json     │
                │  · fallback embebido        │
                └──────────────┬──────────────┘
                               │
                               ▼
                    ┌───────────────────┐
                    │  data/*.json      │──── servidos pelo GitHub Pages
                    │  (5 ficheiros)    │
                    └─────────▲─────────┘
                              │ commits automáticos
                              │
              ┌───────────────┴────────────────┐
              │  GitHub Actions (2 workflows)  │
              │  · daily.yml (todos os dias)   │
              │  · weekly.yml (segundas-feiras)│
              └───────────────┬────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  scripts/*.mjs    │  Node.js scripts
                    │  · fetch-apod     │  que chamam APIs
                    │  · fetch-satellites│  externas e escrevem
                    │  · fetch-mars     │  para data/*.json
                    │  · update-missions│
                    └─────────┬─────────┘
                              │
                              ▼
                    APIs externas
              (NASA, Celestrak, wheretheiss)
```

Tudo grátis. Sem base de dados. Sem servidor. GitHub Pages serve o HTML,
GitHub Actions faz o trabalho de atualização.

---

## Setup completo (do zero até estar online)

### 1. Cria o repositório

Faz upload desta pasta para um novo repositório GitHub. Estrutura esperada:

```
repo/
├── index.html
├── README.md
├── data/
│   ├── events.json
│   ├── satellites.json
│   ├── missions.json
│   ├── apod.json
│   └── mars-photos.json
├── scripts/
│   ├── fetch-apod.mjs
│   ├── fetch-satellites.mjs
│   ├── fetch-mars-photos.mjs
│   └── update-missions.mjs
└── .github/
    └── workflows/
        ├── daily.yml
        └── weekly.yml
```

### 2. Ativa GitHub Pages

Repositório → **Settings** → **Pages** → **Source: Deploy from a branch** →
escolhe branch `main` e pasta `/ (root)`. Guarda.

Em ~1 minuto o site fica em `https://<username>.github.io/<repo-name>/`.

### 3. Obtém uma chave NASA (grátis)

Vai a [api.nasa.gov](https://api.nasa.gov). Preenche o formulário (nome, email).
Recebes a chave por email em segundos. **Guarda a chave**.

Sem chave, os scripts usam `DEMO_KEY` que tem limite de 30 pedidos/hora e é
partilhada por todos. Com chave própria: 1000 pedidos/hora.

### 4. Adiciona a chave como secret no repositório

Repositório → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

- **Name:** `NASA_API_KEY`
- **Secret:** cola a chave que recebeste

### 5. Permite que Actions faça commits

Repositório → **Settings** → **Actions** → **General** → em baixo, secção
**Workflow permissions**: seleciona **"Read and write permissions"** e guarda.

Sem isto, os workflows correm mas não conseguem fazer commit dos dados
atualizados.

### 6. Corre o primeiro update

Repositório → separador **Actions** → escolhe o workflow **"Daily data update"** →
clica **"Run workflow"** → branch `main` → **Run workflow**.

Espera 30-60 segundos. Se tudo correu bem, vais ver um commit novo do
`cosmos-bot` na tab **Commits**, com o APOD atualizado.

Faz o mesmo para o **"Weekly data update"**.

### 7. Confirma que o site está a usar os dados

Abre o site (`https://<username>.github.io/<repo-name>/`). Vai à página
**Sistema Solar** → deves ver a imagem APOD do dia. Abre a consola do browser
(F12) → deves ver mensagens como:

```
[COSMOS] Eventos atualizados (2026-08-16T00:00:00Z)
[COSMOS] Satélites atualizados (...)
[COSMOS] APOD cache local: <título>
```

A partir daqui está tudo automático. Todos os dias às 06:00 UTC o APOD e as
fotos de Marte atualizam-se. Todas as segundas, as contagens de satélites.

---

## Como funcionam os scripts

### `scripts/fetch-apod.mjs`
Chama `api.nasa.gov/planetary/apod`, extrai a imagem do dia (URL, título,
descrição, data), grava em `data/apod.json`. ~40 linhas.

### `scripts/fetch-satellites.mjs`
Chama `celestrak.org/NORAD/elements/gp.php` para os grupos `starlink`,
`oneweb` e `iridium-NEXT`. Conta os satélites de cada, atualiza percentagens
proporcionais, grava em `data/satellites.json`. Sem chave necessária.

### `scripts/fetch-mars-photos.mjs`
Chama `api.nasa.gov/mars-photos/api/v1/rovers/{rover}/latest_photos`.
Prefere fotos das câmaras MASTCAM/NAVCAM (melhor composição). Grava em
`data/mars-photos.json`.

### `scripts/update-missions.mjs`
Faz duas coisas: (1) recalcula as distâncias atuais das Voyager 1 & 2 por
extrapolação linear a partir de posições de referência conhecidas em janeiro
2026; (2) se `data/mars-photos.json` tem foto fresca, integra-a no
`data/missions.json` para as missões Perseverance e Curiosity.

---

## Como adicionar novos eventos ao calendário

Edita `data/events.json`. Encontra a categoria certa e acrescenta um objeto
de evento à sua lista `events`:

```json
{
  "date": "2027-03-15T22:00:00+00:00",
  "title": "Novo evento",
  "short": "Descrição curta",
  "description": "Descrição rica de 2-3 frases…",
  "tags": ["Tag 1", "Tag 2"],
  "viewing": {
    "direction": "SE",
    "altitude": "Médio",
    "constellation": "Órion",
    "bestTime": "22h-02h"
  }
}
```

Faz commit. Site atualiza-se a seguir ao próximo build de GitHub Pages
(~1 min).

## Como adicionar uma missão

Edita `data/missions.json`, acrescenta um objeto ao array `missions`. Precisa
de `id`, `name`, `agency`, `status` (`active`, `enroute`, ou `pending`),
`description`, `image_url` (URL pública para foto), `image_fallback`
(glyph + texto para quando a foto não carrega), `data` (array de pares
`[label, valor]` para o rodapé do cartão).

## Como estender

Para adicionar mais dados dinâmicos:

1. **Adiciona uma nova fonte** — cria um `scripts/fetch-xxx.mjs` que
   siga o padrão dos existentes: importa `fs/promises`, chama a API, grava
   para um novo ficheiro em `data/`.
2. **Agenda a atualização** — adiciona um passo aos workflows YAML existentes
   ou cria um novo workflow com `cron` próprio.
3. **Consome no frontend** — em `index.html`, dentro de `loadLiveData()`,
   adiciona uma chamada `tryFetchJson('data/xxx.json')` e atualiza a UI
   correspondente.

---

## Local development

Para testar localmente antes de fazer push:

```bash
# 1. Servir o site num servidor local (necessário porque fetch() para
#    dados JSON não funciona com file:// no browser)
python3 -m http.server 8000
# abre http://localhost:8000/

# 2. Correr um script para atualizar dados
export NASA_API_KEY=a_tua_chave
node scripts/fetch-apod.mjs
node scripts/fetch-mars-photos.mjs
node scripts/update-missions.mjs
node scripts/fetch-satellites.mjs
```

Node 18+ obrigatório (para `fetch` nativo).

---

## Limitações honestas

**Cache de imagens** — as fotos são carregadas dinamicamente pelo browser a
partir das URLs em `image_url`. Se o Wikimedia ou NASA mudarem uma URL, essa
foto deixa de aparecer (o fallback de design com glyph aparece no lugar).
Solução mais robusta: download das imagens para pasta `images/` local e
referenciar por caminho relativo. Implementável num próximo script de sync.

**Lista de eventos é manual** — os eclipses e chuvas de meteoros são
previsíveis com precisão anos antes. A NASA publica tabelas exaustivas.
Um script poderia scraping dessas tabelas uma vez por ano, mas não vale
a pena — a lista muda pouco e a revisão manual anual é rápida.

**Satélites entre atualizações semanais** — os números podem estar até 7 dias
desatualizados. Para uso prático (contexto, não análise em tempo real) é mais
que suficiente. Fazer isto de hora a hora seria desperdício.

**Rate limits** — `DEMO_KEY` da NASA falha rápido em produção real. Usa
sempre a tua chave própria (grátis).

**GitHub Actions falha silenciosamente** — se um script rebentar, o workflow
continua (`continue-on-error: true`) para que uma falha não impeça as
restantes atualizações. Mas convém veres o separador Actions de vez em
quando para confirmar que nada está permanentemente partido. Configura
notificações em Settings → Notifications → Actions.

---

## Licença

Código: MIT. Dados: as fontes originais mantêm as suas próprias licenças
(NASA e Celestrak são de domínio público / uso livre; Wikimedia Commons
tem licenças específicas por imagem, geralmente CC-BY-SA).

Créditos das imagens são exibidos no site.
