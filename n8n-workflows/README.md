# UNSIC N8N Workflows v3 - Native Nodes Only

**Created:** 2025-12-03
**Version:** 3.0 (100% Native N8N Nodes)

## Overview

3 workflow completi per UNSIC News Intelligence usando SOLO nodi nativi N8N (no Code nodes).

## Workflows

### 1. UNSIC_News_Intelligence.json

**Scopo:** RSS scraping + AI analysis + Top 5 selection

**Trigger:** Schedule (ogni ora)

**Flow:**
1. **RSS Feed Read** (3 paralleli): ANSA, Sole24Ore, Governo
2. **Merge**: Combina tutti gli RSS
3. **Filter**: Solo notizie ultime 24h
4. **Set**: Estrae dati (title, content, source, link, published_at)
5. **Set**: Build AI prompt per analisi
6. **HTTP Request**: Google Gemini 2.0 Flash (JSON response)
7. **Set**: Parse AI response (score, category, pillar, summary, why_relevant)
8. **Filter**: Solo score >= 70
9. **Sort**: Score DESC
10. **Limit**: Top 5
11. **Set**: Add rank (1-5)
12. **HTTP Request**: Save to UNSIC DB (`POST /api/news`)
13. **Merge**: Collect results
14. **Set**: Build summary

**AI Model:** `gemini-3-flash-preview` (fast + cheap)

**Output:** Top 5 notizie salvate in `unsic_news` table con status "pending"

---

### 2. UNSIC_Content_Factory.json

**Scopo:** Content generation multi-platform (LinkedIn, Facebook, Instagram, Twitter)

**Trigger:** Webhook `POST /webhook/unsic-content-factory`

**Payload:**
```json
{
  "news_id": "clxxx123"
}
```

**Flow:**
1. **Webhook**: Riceve `news_id`
2. **Set**: Extract news_id
3. **HTTP Request**: Load news from DB (`GET /api/news/:id`)
4. **Set**: Extract news data + platforms array
5. **Set**: Split platforms (loop 4x: linkedin, facebook, instagram, twitter)
6. **Set**: Build content prompt (platform-specific guidelines)
7. **HTTP Request**: Google Gemini content generation (JSON response)
8. **Set**: Parse content (text, hashtags, cta)
9. **Set**: Build image prompt (category-based style)
10. **HTTP Request**: Nano-Banana image generation (`POST http://172.19.0.1:8100/api/generate`)
11. **Set**: Extract image_url
12. **HTTP Request**: Save content to DB (`POST /api/content`)
13. **Merge**: Collect all 4 platform content
14. **Respond to Webhook**: Return summary

**Platform Guidelines:**
- **LinkedIn**: Professional, 1300 char, 5 hashtags
- **Facebook**: Community, 800 char, 3 hashtags
- **Instagram**: Visual storytelling, 500 char, 30 hashtags
- **Twitter**: Thread 4 tweets, 280 char each

**AI Model:** `gemini-3-flash-preview` (creative mode: temp 0.7)

**Image Dimensions:**
- LinkedIn/Facebook/Twitter: 1200x630
- Instagram: 1080x1080

**Output:** 4 content items salvati in `unsic_content` table con status "ready"

---

### 3. UNSIC_Social_Publisher.json

**Scopo:** Pubblicazione schedulata multi-platform

**Trigger:**
- Schedule (ogni ora) OR
- Webhook `POST /webhook/unsic-publish`

**Flow:**
1. **Merge Triggers**: Combina schedule + webhook
2. **HTTP Request**: Get scheduled content (`GET /api/content?status=ready`)
3. **Filter**: Solo content con `scheduled_for <= NOW`
4. **Set**: Extract content data
5. **IF** (platform router - 4 branch paralleli):
   - LinkedIn → **Set** (mock publish + platform_post_id)
   - Facebook → **Set** (mock publish + platform_post_id)
   - Instagram → **Set** (mock publish + platform_post_id)
   - Twitter → **Set** (mock publish + platform_post_id)
6. **Merge**: Platform results
7. **HTTP Request**: Update content status (`PATCH /api/content/:id`)
8. **Merge**: Collect all updates
9. **Aggregate**: Stats (count platforms)
10. **Set**: Build summary
11. **Respond to Webhook**: Return stats
12. **Telegram**: Notification (optional)

**Mock Publishing:** Attualmente usa **Set nodes** per simulare pubblicazione (genera `platform_post_id` mock). Sostituire con HTTP Request a API reali quando disponibili:
- LinkedIn: `POST https://api.linkedin.com/v2/ugcPosts`
- Facebook: `POST https://graph.facebook.com/v18.0/me/feed`
- Instagram: `POST https://graph.facebook.com/v18.0/me/media`
- Twitter: `POST https://api.twitter.com/2/tweets`

**Output:** Content pubblicati (status "published") + Telegram notification

---

## API Endpoints Required

### UNSIC Next.js API Routes

#### 1. `GET /api/news/:id`
```typescript
// app/api/news/[id]/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const news = await db.unsicNews.findUnique({
    where: { id: params.id }
  })
  return Response.json(news)
}
```

#### 2. `POST /api/content`
```typescript
// app/api/content/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  const content = await db.unsicContent.create({
    data: {
      news_id: body.news_id,
      platform: body.platform,
      content_text: body.content_text,
      content_image_url: body.content_image_url,
      hashtags: body.hashtags,
      status: body.status || 'draft',
      scheduled_for: body.scheduled_for ? new Date(body.scheduled_for) : null
    }
  })
  return Response.json(content)
}
```

#### 3. `GET /api/content?status=ready`
```typescript
// app/api/content/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const content = await db.unsicContent.findMany({
    where: status ? { status } : {},
    orderBy: { scheduled_for: 'asc' }
  })
  return Response.json(content)
}
```

#### 4. `PATCH /api/content/:id`
```typescript
// app/api/content/[id]/route.ts
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const content = await db.unsicContent.update({
    where: { id: parseInt(params.id) },
    data: {
      status: body.status,
      platform_post_id: body.platform_post_id,
      published_at: body.published_at ? new Date(body.published_at) : null
    }
  })
  return Response.json(content)
}
```

---

## Environment Variables

### UNSIC .env
```bash
# /var/www/projects/unsic/.env

# Google Gemini (for N8N workflows)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# N8N Webhooks
N8N_CONTENT_FACTORY_WEBHOOK=https://n8n.fodivps1.cloud/webhook/unsic-content-factory
N8N_PUBLISHER_WEBHOOK=https://n8n.fodivps1.cloud/webhook/unsic-publish

# Telegram (optional notifications)
TELEGRAM_UNSIC_CHAT_ID=123456789
```

### N8N Environment Variables
```bash
# /root/vps-panel/docker-compose.yml (n8n service)

environment:
  - GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY}
  - TELEGRAM_UNSIC_CHAT_ID=${TELEGRAM_UNSIC_CHAT_ID}
```

---

## Import Instructions

### Manual Import (N8N UI)

1. Apri N8N: https://n8n.fodivps1.cloud
2. Click **Workflows** → **Import from File**
3. Upload i 3 file JSON
4. Per ogni workflow:
   - Click sul workflow importato
   - Verifica che tutti i nodi siano verdi (no errori)
   - Click **Save** (salva)
   - Click **Activate** (attiva trigger)

### Automatic Import (N8N CLI - Not Recommended)

```bash
# N8N non supporta import via CLI in v1.120.4
# Usare sempre import manuale via UI
```

---

## Testing Workflows

### Test 1: News Intelligence

```bash
# Trigger manuale workflow (via N8N UI)
# Oppure attendi schedule (ogni ora)

# Verifica risultati
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT id, title, category, rank FROM unsic_news WHERE status='pending' ORDER BY created_at DESC LIMIT 5;"
```

### Test 2: Content Factory

```bash
# Trova un news_id
NEWS_ID=$(docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -t -c "SELECT id FROM unsic_news LIMIT 1;")

# Trigger webhook
curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-content-factory \
  -H "Content-Type: application/json" \
  -d "{\"news_id\": \"$NEWS_ID\"}"

# Verifica content generato
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT platform, LEFT(content_text, 50), status FROM unsic_content ORDER BY created_at DESC LIMIT 4;"
```

### Test 3: Social Publisher

```bash
# Trigger manuale
curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-publish

# Verifica pubblicazioni
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT platform, status, platform_post_id FROM unsic_content WHERE status='published' ORDER BY published_at DESC;"
```

---

## Troubleshooting

### Workflow fails at Google Gemini

**Problema:** `401 Unauthorized` o `API key not valid`

**Soluzione:**
1. Verifica che `GOOGLE_GEMINI_API_KEY` sia impostata in N8N environment
2. Restart N8N container:
   ```bash
   docker restart vps-panel-n8n
   ```
3. Verifica API key valida: https://aistudio.google.com/apikey

### Workflow fails at Nano-Banana

**Problema:** `Connection refused` a `http://172.19.0.1:8100`

**Soluzione:**
1. Verifica Nano-Banana service:
   ```bash
   curl http://172.19.0.1:8100/health
   ```
2. Se down, restart:
   ```bash
   cd /opt/services/nano-banana-service
   docker compose restart
   ```

### Content not publishing (Publisher workflow)

**Problema:** `scheduled_for` non filtra correttamente

**Soluzione:**
1. Verifica timezone in DB (deve essere UTC):
   ```sql
   SELECT scheduled_for, NOW() FROM unsic_content LIMIT 1;
   ```
2. Verifica Filter node condizione:
   ```
   scheduled_for <= NOW (operation: beforeOrEqual)
   ```

### API endpoints 404

**Problema:** `/api/content` non esiste

**Soluzione:**
1. Crea le API routes mancanti (vedi sezione "API Endpoints Required")
2. Restart UNSIC app:
   ```bash
   pm2 restart unsic-dashboard
   ```

---

## Native Nodes Used

| Node Type | Count | Function |
|-----------|-------|----------|
| `n8n-nodes-base.scheduleTrigger` | 2 | Cron scheduling |
| `n8n-nodes-base.webhook` | 2 | HTTP triggers |
| `n8n-nodes-base.rssFeedRead` | 3 | RSS parsing |
| `n8n-nodes-base.httpRequest` | 10 | HTTP calls (Gemini, DB, Nano-Banana) |
| `n8n-nodes-base.set` | 15 | Data transformation |
| `n8n-nodes-base.filter` | 3 | Conditional filtering |
| `n8n-nodes-base.merge` | 6 | Combine data streams |
| `n8n-nodes-base.sort` | 1 | Sort by score |
| `n8n-nodes-base.limit` | 1 | Limit to top 5 |
| `n8n-nodes-base.if` | 4 | Platform routing |
| `n8n-nodes-base.aggregate` | 1 | Stats aggregation |
| `n8n-nodes-base.respondToWebhook` | 2 | Webhook responses |
| `n8n-nodes-base.telegram` | 1 | Telegram notifications |

**Total:** 51 nodi nativi, 0 Code nodes

---

## Next Steps

1. **Import workflows** in N8N (manuale via UI)
2. **Create missing API routes** in UNSIC Next.js app
3. **Set environment variables** (GOOGLE_GEMINI_API_KEY)
4. **Test News Intelligence** workflow (trigger manuale o attendi schedule)
5. **Test Content Factory** (webhook con news_id reale)
6. **Replace mock publishers** con API reali (LinkedIn, Facebook, Instagram, Twitter)
7. **Setup Telegram bot** per notifiche (optional)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNSIC N8N AI Pipeline                        │
└─────────────────────────────────────────────────────────────────┘

1. NEWS INTELLIGENCE (Hourly)
   ┌──────────┐
   │ Schedule │──┬──→ RSS ANSA ────┐
   └──────────┘  ├──→ RSS Sole24 ───┼──→ Merge ──→ Filter 24h
                 └──→ RSS Governo ──┘              ↓
                                                Gemini AI
                                                   ↓
                                              Filter >=70
                                                   ↓
                                              Sort + Top5
                                                   ↓
                                            Save to UNSIC DB
                                            (status: pending)

2. CONTENT FACTORY (On Demand)
   ┌─────────┐
   │ Webhook │──→ Load News ──→ Loop Platforms ──→ Gemini Content
   └─────────┘                  (4x parallel)           ↓
                                                   Nano-Banana
                                                      Image
                                                        ↓
                                                  Save Content
                                                  (status: ready)

3. SOCIAL PUBLISHER (Hourly + Manual)
   ┌──────────┐
   │ Schedule │──┬──→ Get Ready Content ──→ Filter Due ──→ Platform Router
   └──────────┘  │                                          ↓    ↓    ↓    ↓
   ┌─────────┐   │                                      LinkedIn FB  IG  TW
   │ Webhook │───┘                                          ↓    ↓    ↓    ↓
   └─────────┘                                          Update DB (published)
                                                               ↓
                                                          Telegram
                                                        Notification
```

---

**Maintainer:** Claude Code (backend-senior-dev agent)
**VPS:** fodivps1.cloud
**N8N Version:** 1.120.4
**Last Updated:** 2025-12-03
