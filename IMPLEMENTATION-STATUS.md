# UNSIC News Automation - Implementation Status

**Ultimo aggiornamento:** 2025-12-03
**Fase corrente:** Settimana 1 - Fondamenta (Database + API)
**Status:** ✅ FASE 1 COMPLETATA

---

## ✅ Completato (Settimana 1, Giorni 1-2)

### Database Schema Extensions
- ✅ **Prisma Schema** aggiornato con:
  - 10 nuovi campi per AI copy (linkedin, twitter, instagram)
  - 3 campi per design assets (bg_image, final_image, canva_design_id)
  - 4 campi per social publishing (linkedin_post_id, twitter_post_id, instagram_post_id, publish_error)
  - 2 nuove tabelle (`UnsicLog`, `SocialConfig`)

- ✅ **Migration** `20251203003039_unsic_automation` applicata con successo
- ✅ **Prisma Client** generato e funzionante

### API Routes (4 nuove route)
- ✅ `POST /api/news/[id]/update-copy` - Aggiorna copy generato da N8N
- ✅ `POST /api/news/[id]/publish` - Trigger publishing workflow + PATCH per update status
- ✅ `POST /api/news/[id]/regenerate-copy` - Re-trigger copywriting AI
- ✅ `POST /api/logs` + `GET /api/logs` - Activity logs con filtri

### Prompt Gemini AI
- ✅ **Filtering Prompt** (`/prompts/filtering_prompt.json`):
  - Sistema di scoring 0-100 (threshold ≥ 70)
  - 6 categorie (Fisco, Lavoro, Agricoltura, PNRR, Made in Italy, Impresa)
  - 4 pillar UNSIC
  - Rank 1-5 per urgenza

- ✅ **Copywriting Prompt** (`/prompts/copywriting_prompt.json`):
  - Tone of voice per piattaforma (LinkedIn, Twitter, Instagram)
  - Brand voice UNSIC
  - Hashtag strategy
  - Output JSON con 3 varianti copy

### Configuration Files
- ✅ **RSS Sources** (`/config/rss_sources.json`):
  - 12 fonti attive (ANSA, Sole24Ore, Repubblica, Corriere, Gov.it, INPS, Agenzia Entrate, MISE, Confagricoltura, Milano Finanza)
  - 3 fonti disabilitate (da attivare se necessario)
  - Config scraping (schedule, retry logic, thresholds)

- ✅ **Environment Variables** (`.env`):
  - N8N webhooks (scraper, publisher, errors)
  - Nano-Banana URL
  - Gemini API (source da shared secrets)
  - Placeholder per LinkedIn/Twitter/Instagram API
  - SMTP Hostinger configurato

---

## 📋 File Creati/Modificati

### Database
```
prisma/schema.prisma (MODIFIED - +50 righe)
prisma/migrations/20251203003039_unsic_automation/migration.sql (CREATED)
```

### API Routes
```
src/app/api/news/[id]/update-copy/route.ts (CREATED - 68 righe)
src/app/api/news/[id]/publish/route.ts (CREATED - 157 righe)
src/app/api/news/[id]/regenerate-copy/route.ts (CREATED - 71 righe)
src/app/api/logs/route.ts (CREATED - 88 righe)
```

### Configuration
```
prompts/filtering_prompt.json (CREATED - 95 righe)
prompts/copywriting_prompt.json (CREATED - 112 righe)
config/rss_sources.json (CREATED - 15 fonti)
.env (MODIFIED - +40 righe)
```

### N8N Workflows
```
n8n-workflows/UNSIC_News_Scraper.json (CREATED - 350+ righe)
n8n-workflows/UNSIC_Error_Monitor.json (CREATED - 120+ righe)
n8n-workflows/SETUP-GUIDE.md (CREATED - Guida completa import/config)
```

---

## ✅ Completato (Settimana 1, Giorni 3-4)

### N8N Workflow 1 (Scraper)
- ✅ **Workflow JSON creato** (`/n8n-workflows/UNSIC_News_Scraper.json`)
- ✅ **Workflow Error Monitor creato** (`/n8n-workflows/UNSIC_Error_Monitor.json`)
- ✅ **Guida setup completa** (`/n8n-workflows/SETUP-GUIDE.md`)
- ✅ Nodi implementati:
  - Schedule Trigger (cron 07:00)
  - Load RSS Sources (3 fonti iniziali)
  - Fetch + Parse RSS
  - Deduplication (24h + link)
  - Gemini AI Filtering (score ≥ 70)
  - Top 5 selection
  - POST /api/news batch
  - Error monitoring integration

### N8N Workflow 3 (Error Monitor)
- ✅ Webhook `/unsic-errors`
- ✅ POST /api/logs
- ✅ Email alert SMTP (se critical)
- ✅ Response webhook

## 🎯 Prossimi Passi (Settimana 1, Giorno 5 - Setup Manuale)

### Setup N8N (Azioni Manuali Richieste)
- [ ] Accedere a N8N: https://n8n.fodivps1.cloud
- [ ] **Step 1:** Configurare credenziali Gemini API in N8N
- [ ] Configurare credenziali Gemini in N8N (API key da `/home/shared/secrets/api-keys.env`)
- [ ] Implementare nodi:
  1. **Schedule Trigger**: Cron `0 7 * * *` (ogni giorno alle 07:00)
  2. **HTTP Request Multi**: Leggere da `/config/rss_sources.json`, scansionare fonti `enabled=true`
  3. **Function: Parse RSS**: Estrarre title, description, link, pubDate
  4. **Function: Deduplication**: Verificare se articolo già esiste (via link o title similarity)
  5. **Loop Over Items**: Per ogni notizia
  6. **HTTP Request: Gemini API**:
     - Model: `gemini-3-flash-preview`
     - Prompt: `/prompts/filtering_prompt.json`
     - Output: `{ score, category, pillar, rank, summary, why_relevant }`
  7. **IF Node**: Se `score >= 70` → continua, altrimenti skip
  8. **Function: Sort by Rank**: Top 5 notizie per score/rank
  9. **HTTP Request: POST /api/news**: Batch insert notizie con status="pending"
- [ ] Test con 3 fonti iniziali (ANSA Economia, Sole24Ore, Gov.it)
- [ ] Verificare inserimento DB: `psql postgresql://unsic_user:***@localhost:5439/unsic_db -c "SELECT * FROM unsic_news WHERE status='pending'"`

### Giorno 5: N8N Workflow 3 (Error Monitor)
- [ ] Creare workflow "UNSIC_Error_Monitor"
- [ ] Implementare nodi:
  1. **Webhook Trigger**: `/webhook/unsic-errors`
  2. **HTTP Request: POST /api/logs**: Salva error nel DB
  3. **IF Node**: Se `level === 'critical'`
  4. **Email Node** (SMTP Hostinger):
     - To: `emanuelegalle@gmail.com`
     - From: `noreply@fodisrl.it`
     - Subject: `[UNSIC] Critical Error in {workflow}`
     - Body: Template con dettagli errore
- [ ] Test email alert

---

## 🔧 Prerequisiti Rimanenti

### API Credentials da Configurare (prima della Settimana 3)

**LinkedIn API:**
1. Accedi a https://www.linkedin.com/developers/apps
2. Crea app "UNSIC News Publisher"
3. Richiedi accesso a `w_member_social` (per posting)
4. Ottieni: `client_id`, `client_secret`, `access_token`, `organization_urn`
5. Aggiorna `.env`

**Twitter API:**
1. Accedi a https://developer.twitter.com/en/portal/dashboard
2. Crea app "UNSIC News Bot"
3. Richiedi "Elevated Access" (per media upload)
4. Ottieni: `api_key`, `api_secret`, `access_token`, `access_secret`, `bearer_token`
5. Aggiorna `.env`

**Instagram Graph API:**
1. Accedi a https://developers.facebook.com/apps
2. Crea app "UNSIC News Publisher"
3. Collega Instagram Business Account
4. Ottieni long-lived `access_token` (valido 60 giorni)
5. Ottieni: `instagram_user_id`, `facebook_page_id`
6. Aggiorna `.env`

---

## 📊 Progress Tracking

| Settimana | Fase | Status | Completamento |
|-----------|------|--------|---------------|
| **1** | Fondamenta (DB + API) | ✅ DONE | 100% (2/2 giorni) |
| **1** | Workflow 1 (Scraper) | ✅ DONE | 100% (2/2 giorni) |
| **1** | Error Monitor | ✅ DONE | 100% (1/1 giorno) |
| **1** | Setup N8N Manuale | 🔄 IN PROGRESS | 0% (0/1 giorno) |
| **2** | Copywriting + Design | ⏳ PENDING | 0% (0/5 giorni) |
| **3** | Social Publishing | ⏳ PENDING | 0% (0/5 giorni) |
| **4** | Dashboard UI | ⏳ PENDING | 0% (0/6 giorni) |
| **5** | Production Deploy | ⏳ PENDING | 0% (0/7 giorni) |

**Overall Progress:** 14% (5/36 giorni totali)

---

## 🧪 Testing Checklist

### Database (✅ Testato)
- [x] Migration applicata senza errori
- [x] Prisma Client generato
- [x] Nuovi campi visibili in DB
- [x] Relazioni funzionanti (UnsicNews ↔ UnsicLog)

### API Routes (⏳ Da testare con Postman)
- [ ] POST /api/news/:id/update-copy
- [ ] POST /api/news/:id/publish
- [ ] POST /api/news/:id/regenerate-copy
- [ ] POST /api/logs
- [ ] GET /api/logs con filtri

---

## 📝 Note Tecniche

**Gemini API Key:**
```bash
# Source da shared secrets
source /home/shared/secrets/api-keys.env
echo $GOOGLE_GEMINI_API_KEY
```

**Database Access:**
```bash
# Via Docker
docker exec -it unsic-postgres psql -U unsic_user -d unsic_db

# Query utili
SELECT * FROM unsic_news WHERE status='pending';
SELECT * FROM unsic_logs ORDER BY created_at DESC LIMIT 10;
```

**PM2 Restart (dopo modifiche):**
```bash
cd /var/www/projects/unsic
npm run build
pm2 restart unsic-dashboard
pm2 logs unsic-dashboard
```

---

## 🚨 Troubleshooting

**Se API routes non funzionano:**
1. Rebuild: `npm run build`
2. Restart PM2: `pm2 restart unsic-dashboard`
3. Check logs: `pm2 logs unsic-dashboard --lines 100`

**Se Prisma errori:**
1. Rigenera client: `npx prisma generate`
2. Verifica migration: `npx prisma migrate status`

---

**Prossima azione:** Iniziare implementazione Workflow 1 (Scraper) su N8N 🚀
