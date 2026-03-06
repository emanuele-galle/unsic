# N8N Workflows Import Guide - UNSIC News v3

**Created:** 2025-12-03
**Status:** Ready for Import

## Pre-Import Checklist

### 1. API Endpoints Verification

```bash
# Verifica che tutte le API siano attive
curl -s https://unsic.muscarivps.cloud/api/news | jq '.count'
curl -s https://unsic.muscarivps.cloud/api/content | jq '.count'

# Test POST news (mock)
curl -X POST https://unsic.muscarivps.cloud/api/news \
  -H "Content-Type: application/json" \
  -d '{
    "category": "fisco",
    "pillar": "normativo",
    "rank": 1,
    "title": "Test News",
    "summary": "Test summary",
    "why_relevant": "Test relevance",
    "source": "Test Source",
    "link": "https://example.com"
  }'
```

### 2. Environment Variables Setup

#### N8N Environment Variables

Aggiungi al file `/root/vps-panel/.env`:

```bash
# Google Gemini API
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Telegram Bot (optional for notifications)
TELEGRAM_UNSIC_CHAT_ID=your_chat_id_here
```

Restart N8N container:

```bash
cd /root/vps-panel
docker compose restart n8n
```

Verifica che le variabili siano caricate:

```bash
docker exec vps-panel-n8n env | grep GOOGLE_GEMINI
```

### 3. Nano-Banana Service Check

Verifica che Nano-Banana sia raggiungibile da N8N:

```bash
# Da VPS host
curl -s http://172.19.0.1:8100/health

# Expected response:
# {"status":"healthy","model":"flux-schnell"}
```

Se non risponde:

```bash
cd /opt/services/nano-banana-service
docker compose up -d
docker compose logs -f
```

---

## Import Instructions

### Step 1: Access N8N

1. Apri browser: https://n8n.muscarivps.cloud
2. Login con credenziali VPS Panel
3. Click su **Workflows** nel menu laterale

### Step 2: Import Workflows (Manual)

Per ogni workflow:

#### A. UNSIC_News_Intelligence.json

1. Click **Import from File**
2. Upload `/var/www/projects/unsic/n8n-workflows/v3/UNSIC_News_Intelligence.json`
3. Rename workflow in: **"UNSIC News Intelligence v3"**
4. Click **Save**

**Verifica nodi critici:**

- **Schedule Trigger**: Verifica cron (default: ogni ora)
- **RSS Feed Read** (x3): Verifica URL RSS funzionanti
- **HTTP Request (Gemini)**: Verifica che `GOOGLE_GEMINI_API_KEY` sia caricata
- **HTTP Request (Save DB)**: Verifica URL `https://unsic.muscarivps.cloud/api/news`

5. Click **Activate** (toggle switch in alto a destra)

#### B. UNSIC_Content_Factory.json

1. Click **Import from File**
2. Upload `/var/www/projects/unsic/n8n-workflows/v3/UNSIC_Content_Factory.json`
3. Rename workflow in: **"UNSIC Content Factory v3"**
4. Click **Save**

**Verifica nodi critici:**

- **Webhook Trigger**: Nota l'URL generato (es. `https://n8n.muscarivps.cloud/webhook/unsic-content-factory`)
- **HTTP Request (Load News)**: Verifica URL `https://unsic.muscarivps.cloud/api/news/:id`
- **HTTP Request (Gemini)**: Verifica API key
- **HTTP Request (Nano-Banana)**: Verifica URL `http://172.19.0.1:8100/api/generate`
- **HTTP Request (Save Content)**: Verifica URL `https://unsic.muscarivps.cloud/api/content`

5. Click **Activate**

#### C. UNSIC_Social_Publisher.json

1. Click **Import from File**
2. Upload `/var/www/projects/unsic/n8n-workflows/v3/UNSIC_Social_Publisher.json`
3. Rename workflow in: **"UNSIC Social Publisher v3"**
4. Click **Save**

**Verifica nodi critici:**

- **Schedule Trigger**: Verifica cron (default: ogni ora)
- **Webhook Trigger**: Nota l'URL generato (es. `https://n8n.muscarivps.cloud/webhook/unsic-publish`)
- **HTTP Request (Get Content)**: Verifica URL `https://unsic.muscarivps.cloud/api/content?status=ready`
- **HTTP Request (Update Status)**: Verifica URL `https://unsic.muscarivps.cloud/api/content/:id`
- **Telegram Node** (optional): Configura credenziali Telegram Bot se vuoi notifiche

5. Click **Activate**

---

## Step 3: Test Workflows

### Test 1: News Intelligence (Automatic)

Il workflow si attiva automaticamente ogni ora. Per test manuale:

1. Apri workflow "UNSIC News Intelligence v3"
2. Click **Execute Workflow** (play button in alto a destra)
3. Attendi 30-60 secondi (processing RSS + AI)
4. Verifica output nell'ultima esecuzione (tab "Executions")

**Expected output:**
- 3 RSS feeds processati
- Notizie filtrate (score >= 70)
- Top 5 notizie salvate in DB

**Verifica DB:**
```bash
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT title, category, rank, created_at FROM unsic_news ORDER BY created_at DESC LIMIT 5;"
```

### Test 2: Content Factory (Webhook)

**Prerequisito:** Serve almeno 1 news in DB.

1. Trova un `news_id`:
   ```bash
   NEWS_ID=$(docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -t -c "SELECT id FROM unsic_news LIMIT 1;")
   echo $NEWS_ID
   ```

2. Trigger webhook:
   ```bash
   curl -X POST https://n8n.muscarivps.cloud/webhook/unsic-content-factory \
     -H "Content-Type: application/json" \
     -d "{\"news_id\": \"$NEWS_ID\"}"
   ```

3. Verifica response (JSON con success: true)

4. Verifica DB:
   ```bash
   docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
     -c "SELECT platform, LEFT(content_text, 50) as text_preview, status FROM unsic_content ORDER BY created_at DESC LIMIT 4;"
   ```

**Expected output:**
- 4 content items (linkedin, facebook, instagram, twitter)
- Status: "ready"
- `content_image_url` presente

### Test 3: Social Publisher (Manual Trigger)

**Prerequisito:** Serve almeno 1 content con status "ready" e `scheduled_for` passato.

1. Imposta un content come "pronto per pubblicazione":
   ```bash
   docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
     -c "UPDATE unsic_content SET status='ready', scheduled_for=NOW() - INTERVAL '1 hour' WHERE status='draft' LIMIT 1;"
   ```

2. Trigger webhook:
   ```bash
   curl -X POST https://n8n.muscarivps.cloud/webhook/unsic-publish
   ```

3. Verifica response (JSON con total_published, platforms)

4. Verifica DB:
   ```bash
   docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
     -c "SELECT platform, status, platform_post_id, published_at FROM unsic_content WHERE status='published' ORDER BY published_at DESC;"
   ```

**Expected output:**
- Content status aggiornato a "published"
- `platform_post_id` presente (mock: `linkedin_mock_...`)
- `published_at` timestamp

---

## Step 4: Integration with UNSIC Dashboard

### Webhook Configuration

Aggiungi webhook URL nel file `.env` di UNSIC:

```bash
# /var/www/projects/unsic/.env

N8N_CONTENT_FACTORY_WEBHOOK=https://n8n.muscarivps.cloud/webhook/unsic-content-factory
N8N_PUBLISHER_WEBHOOK=https://n8n.muscarivps.cloud/webhook/unsic-publish
```

Restart UNSIC app:

```bash
pm2 restart unsic-dashboard
```

### Dashboard Trigger Points

1. **News Approval** → Trigger Content Factory
2. **Manual Publish** → Trigger Social Publisher

(Feature da implementare nel dashboard Next.js)

---

## Troubleshooting

### Workflow fails with "GOOGLE_GEMINI_API_KEY not found"

**Problema:** Environment variable non caricata in N8N

**Soluzione:**
```bash
# 1. Aggiungi al .env
echo "GOOGLE_GEMINI_API_KEY=your_key_here" >> /root/vps-panel/.env

# 2. Restart N8N
cd /root/vps-panel
docker compose restart n8n

# 3. Verifica
docker exec vps-panel-n8n env | grep GOOGLE_GEMINI
```

### Workflow fails at Nano-Banana image generation

**Problema:** Connection refused a `http://172.19.0.1:8100`

**Soluzione:**
```bash
# Verifica servizio
curl http://172.19.0.1:8100/health

# Se down, restart
cd /opt/services/nano-banana-service
docker compose up -d
docker compose logs -f
```

### Workflow fails at "Save to UNSIC DB"

**Problema:** 500 Internal Server Error

**Soluzione:**
```bash
# Verifica PM2 logs
pm2 logs unsic-dashboard --lines 50

# Verifica DB connection
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -c "SELECT 1;"

# Restart app
pm2 restart unsic-dashboard
```

### RSS Feed Read returns empty

**Problema:** URL RSS non valido o down

**Soluzione:**
```bash
# Test RSS feeds manualmente
curl -s "https://www.ansa.it/sito/notizie/economia/economia_rss.xml" | head -20
curl -s "https://www.ilsole24ore.com/rss/economia.xml" | head -20

# Se down, sostituisci URL nel nodo RSS Feed Read
```

### Content Factory generates duplicate content

**Problema:** Stesso `news_id` chiamato più volte

**Soluzione:**
Aggiungi check nel workflow o nel DB:

```sql
-- Verifica duplicati
SELECT news_id, platform, COUNT(*)
FROM unsic_content
GROUP BY news_id, platform
HAVING COUNT(*) > 1;

-- Rimuovi duplicati (keep latest)
DELETE FROM unsic_content a
USING unsic_content b
WHERE a.id < b.id
  AND a.news_id = b.news_id
  AND a.platform = b.platform;
```

### Social Publisher doesn't publish anything

**Problema:** `scheduled_for` filtro troppo restrittivo

**Soluzione:**
```sql
-- Verifica content ready
SELECT id, platform, status, scheduled_for, NOW()
FROM unsic_content
WHERE status = 'ready';

-- Se scheduled_for è nel futuro, aggiorna:
UPDATE unsic_content
SET scheduled_for = NOW() - INTERVAL '1 hour'
WHERE status = 'ready' AND scheduled_for > NOW();
```

---

## Next Steps

### 1. Replace Mock Publishers

Attualmente il Publisher workflow usa **Set nodes** per simulare pubblicazione.

Per integrare API reali:

#### LinkedIn API

```typescript
// Sostituisci "Publish to LinkedIn (Mock)" con HTTP Request:
POST https://api.linkedin.com/v2/ugcPosts
Headers:
  Authorization: Bearer {access_token}
  X-Restli-Protocol-Version: 2.0
Body:
{
  "author": "urn:li:person:{person_id}",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "{{ $json.content_text }}"
      },
      "shareMediaCategory": "IMAGE",
      "media": [{
        "status": "READY",
        "media": "{{ $json.content_image_url }}"
      }]
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

#### Facebook Graph API

```typescript
POST https://graph.facebook.com/v18.0/me/feed
Headers:
  Authorization: Bearer {access_token}
Body:
{
  "message": "{{ $json.content_text }}",
  "link": "{{ $json.content_image_url }}"
}
```

#### Instagram Graph API

```typescript
// Step 1: Create media container
POST https://graph.facebook.com/v18.0/me/media
{
  "image_url": "{{ $json.content_image_url }}",
  "caption": "{{ $json.content_text }}"
}

// Step 2: Publish container
POST https://graph.facebook.com/v18.0/me/media_publish
{
  "creation_id": "{creation_id_from_step_1}"
}
```

#### Twitter API v2

```typescript
POST https://api.twitter.com/2/tweets
Headers:
  Authorization: Bearer {access_token}
Body:
{
  "text": "{{ $json.content_text }}"
}
```

### 2. Setup Social API Credentials

1. Crea apps su ogni piattaforma:
   - LinkedIn: https://www.linkedin.com/developers/apps
   - Facebook/Instagram: https://developers.facebook.com/apps
   - Twitter: https://developer.twitter.com/apps

2. Ottieni access tokens (OAuth 2.0)

3. Salva in DB `social_config`:
   ```sql
   INSERT INTO social_config (platform, access_token, refresh_token, token_expires, config_json)
   VALUES ('linkedin', 'encrypted_token', 'encrypted_refresh', NOW() + INTERVAL '60 days', '{"account_id":"xxx"}');
   ```

4. Sostituisci i nodi "Mock" nei workflow con HTTP Request alle API reali

### 3. Setup Telegram Notifications (Optional)

1. Crea Telegram Bot: https://t.me/BotFather
2. Ottieni API token
3. Trova Chat ID:
   ```bash
   # Send message to bot, then:
   curl https://api.telegram.org/bot{TOKEN}/getUpdates
   ```
4. Aggiungi credential in N8N:
   - Name: "UNSIC Telegram Bot"
   - Type: Telegram
   - Access Token: `{your_bot_token}`

5. Update workflow "UNSIC Social Publisher v3":
   - Abilita nodo "Telegram Notification"
   - Set Chat ID: `{your_chat_id}`

### 4. Add Content Analytics

Crea workflow separato per raccogliere metriche:

```
Schedule (Daily 23:00)
  → Get Published Content (last 24h)
  → Split by Platform
  → LinkedIn API (get post stats)
  → Facebook API (get post insights)
  → Instagram API (get media insights)
  → Twitter API (get tweet metrics)
  → Save to unsic_analytics table
```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# 1. Verifica workflow attivi
curl -s https://n8n.muscarivps.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: your_api_key" \
  | jq '.data[] | select(.name | contains("UNSIC")) | {name, active}'

# 2. Verifica ultime esecuzioni
# (via N8N UI → Executions tab)

# 3. Verifica content generati oggi
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT COUNT(*), status FROM unsic_content WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY status;"
```

### Weekly Maintenance

```bash
# 1. Cleanup old executions (N8N)
# Settings → Log Streaming → Execution Data Prune (keep 7 days)

# 2. Cleanup rejected news
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "DELETE FROM unsic_news WHERE status='rejected' AND created_at < NOW() - INTERVAL '30 days';"

# 3. Archive published content
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "UPDATE unsic_content SET status='archived' WHERE status='published' AND published_at < NOW() - INTERVAL '60 days';"
```

---

## Files Summary

| File | Path | Description |
|------|------|-------------|
| **Workflow 1** | `/var/www/projects/unsic/n8n-workflows/v3/UNSIC_News_Intelligence.json` | RSS scraping + AI analysis |
| **Workflow 2** | `/var/www/projects/unsic/n8n-workflows/v3/UNSIC_Content_Factory.json` | Multi-platform content generation |
| **Workflow 3** | `/var/www/projects/unsic/n8n-workflows/v3/UNSIC_Social_Publisher.json` | Scheduled publishing |
| **README** | `/var/www/projects/unsic/n8n-workflows/v3/README.md` | Technical documentation |
| **Import Guide** | `/var/www/projects/unsic/n8n-workflows/v3/IMPORT-GUIDE.md` | This file |

---

**Maintainer:** Claude Code (backend-senior-dev agent)
**VPS:** muscarivps.cloud
**N8N Version:** 1.120.4
**Created:** 2025-12-03
**Status:** ✅ Production Ready
