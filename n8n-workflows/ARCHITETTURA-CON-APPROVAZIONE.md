# 🏗️ UNSIC News - Architettura con Approvazione Umana

**Versione**: 3.0 (con Human-in-the-Loop)

---

## 📐 Flusso Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FASE 1: ANALISI                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Schedule (07:00) → RSS Feeds (x3) → Merge                         │
│                                        ↓                             │
│                          AI Agent #1: News Analyzer                  │
│                          ├─ Gemini LLM                              │
│                          ├─ Tool: query_database                    │
│                          ├─ Tool: generate_image                    │
│                          └─ Memory: Postgres                        │
│                                        ↓                             │
│                          Filter (score ≥ 70)                        │
│                                        ↓                             │
│                    Save to DB (status: pending_approval)            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  FASE 2: APPROVAZIONE UMANA                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Dashboard UNSIC: https://unsic.muscarivps.cloud/dashboard/news      │
│                                                                      │
│  Umano vede:                                                        │
│  ┌────────────────────────────────────────────────────┐            │
│  │ Notizia: "Nuove agevolazioni fiscali..."           │            │
│  │ Score: 85 | Categoria: fisco                       │            │
│  │ Summary: "Startup innovative possono..."           │            │
│  │                                                     │            │
│  │ [✅ APPROVA]  [❌ RIFIUTA]                         │            │
│  └────────────────────────────────────────────────────┘            │
│                                                                      │
│  Click APPROVA:                                                     │
│  → PATCH /api/news/:id {status: "approved"}                        │
│  → Trigger webhook N8N: /webhook/news-approved                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 3: GENERAZIONE CONTENUTI                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Webhook Trigger: /news-approved                                    │
│                   ↓                                                  │
│            Load News from DB                                         │
│                   ↓                                                  │
│      Loop Platforms (x4: LinkedIn, FB, IG, TW)                      │
│                   ↓                                                  │
│         AI Agent #2: Content Creator                                │
│         ├─ Gemini LLM (temperature 0.7)                             │
│         ├─ Tool: generate_image (Nano-Banana)                       │
│         ├─ Tool: query_database (context)                           │
│         └─ Memory: Postgres                                         │
│                   ↓                                                  │
│    Genera: {text, hashtags, cta, image_url}                         │
│                   ↓                                                  │
│       Save to unsic_content (status: ready)                         │
│                   ↓                                                  │
│              Merge Results (4 content per news)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                 FASE 4: PUBBLICAZIONE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Schedule (every hour) OR Webhook (manual)                          │
│                   ↓                                                  │
│    GET /api/content?status=ready&scheduled_for≤NOW                 │
│                   ↓                                                  │
│         Platform Router (IF nodes)                                  │
│         ├─ LinkedIn API (mock)                                      │
│         ├─ Facebook API (mock)                                      │
│         ├─ Instagram API (mock)                                     │
│         └─ Twitter API (mock)                                       │
│                   ↓                                                  │
│    PATCH /api/content/:id {status: published}                      │
│                   ↓                                                  │
│          Telegram Notification (admin)                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow N8N da Creare/Modificare

### Workflow 1: UNSIC_News_Analyzer (già esiste - modificare)

**File**: UNSIC News with AI Agent (JE5iydikZSALEy4I)

**Modifica**:
- ✅ Mantieni AI Agent con Tools
- ✅ Filter ≥ 70
- ✅ Save to DB
- ⚠️ **CAMBIA**: status da "pending" a **"pending_approval"**
- ❌ **RIMUOVI**: Tutto dopo Save to DB (non serve Content Creator qui)

**Ultimo nodo**:
```json
HTTP Request: Save to DB
Body: {
  ...news data...,
  "status": "pending_approval"  ← IMPORTANTE
}
```

---

### Workflow 2: UNSIC_Content_Generator (NUOVO)

**Trigger**: Webhook `/news-approved`

**Struttura**:
```
Webhook Trigger (/news-approved)
  Input: { news_id: "rec123" }
      ↓
HTTP Request: Load News (GET /api/news/:id)
  Filter: WHERE status = 'approved'
      ↓
Set: Create Platforms Array (['linkedin', 'facebook', 'instagram', 'twitter'])
      ↓
Split Out: platforms
      ↓
Set: Current Platform
      ↓
AI Agent #2: Content Creator
├─ Gemini LLM (temp 0.7)
├─ Output Parser (JSON)
├─ Tool: generate_image
├─ Tool: query_database
└─ Memory: Postgres
      ↓
Build Content Record
      ↓
HTTP Request: Save Content (POST /api/content)
  Body: { news_id, platform, content_text, hashtags, image_url, status: "ready" }
      ↓
Aggregate All (4 content per news)
      ↓
Webhook Response: { success: true, content_created: 4 }
```

---

### Workflow 3: UNSIC_Social_Publisher (già esiste - OK)

**Trigger**: Schedule (hourly) o Webhook manual

Questo va bene così com'è!

---

## 🖥️ Dashboard UNSIC - UI Approvazione

Devi aggiungere nella dashboard UNSIC:

### Pagina: /dashboard/pending-approval

**Lista notizie pending_approval**:

```typescript
// app/dashboard/pending-approval/page.tsx

export default async function PendingApprovalPage() {
  const pendingNews = await db.unsicNews.findMany({
    where: { status: 'pending_approval' },
    orderBy: { created_at: 'desc' }
  });

  return (
    <div>
      {pendingNews.map(news => (
        <NewsCard
          key={news.id}
          news={news}
          onApprove={async () => {
            // 1. Update DB
            await fetch(`/api/news/${news.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'approved' })
            });

            // 2. Trigger Content Generator
            await fetch('https://n8n.muscarivps.cloud/webhook/news-approved', {
              method: 'POST',
              body: JSON.stringify({ news_id: news.id })
            });
          }}
          onReject={async () => {
            await fetch(`/api/news/${news.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'rejected' })
            });
          }}
        />
      ))}
    </div>
  );
}
```

---

## 🎯 Vantaggi Human-in-the-Loop

✅ **Qualità controllata**: Umano verifica prima della pubblicazione
✅ **Flessibilità**: Può modificare, rifiutare, posticipare
✅ **Brand safety**: Nessun contenuto inappropriato pubblicato automaticamente
✅ **Learning**: L'AI impara dalle approvazioni/rifiuti (con Memory)

---

## 🚀 Quick Start

1. **Modifica Workflow 1** (News Analyzer):
   - Cambia status save → "pending_approval"
   - Rimuovi nodi dopo Save to DB

2. **Crea Workflow 2** (Content Generator):
   - Webhook trigger /news-approved
   - AI Agent con Tools
   - Loop 4 platforms
   - Save content

3. **Aggiungi UI Dashboard**:
   - Pagina pending-approval
   - Bottoni Approva/Rifiuta
   - Trigger webhook N8N

4. **Test**:
   - Esegui Workflow 1 → Verifica news in pending
   - Approva dalla dashboard → Trigger Workflow 2
   - Verifica content generato

Vuoi che ti aiuti a creare il Workflow 2 (Content Generator con webhook) o la UI dashboard di approvazione? 🎯
