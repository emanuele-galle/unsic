# 🎨 Estensione Workflow: AI Agent Content Creator

**Workflow da estendere**: UNSIC News with AI Agent

---

## 🎯 Architettura Completa

```
RSS Feeds (x3)
      ↓
   Merge
      ↓
   Clean Data
      ↓
AI Agent #1: News Analyzer (con Tools)
├─ Tool: query_database
├─ Tool: generate_image
└─ Memory: Postgres
      ↓
Filter Relevant (score ≥ 70)
      ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ AGGIUNGI QUI ⬇️
      ↓
Split Into Batches (loop ogni news)
      ↓
Loop Platforms (LinkedIn, Facebook, Instagram, Twitter)
      ↓
AI Agent #2: Content Creator (con Tools)
├─ Tool: generate_image (Nano-Banana)
├─ Tool: query_database (context)
└─ Memory: Postgres
      ↓
Save Content to DB (unsic_content)
      ↓
Merge Results
      ↓
Stats Summary
```

---

## 📋 Nodi da Aggiungere nel Canvas N8N

### 1. Split Into Batches (dopo "Filter Relevant")

**Add Node** → Cerca: `split in batches`

```
Configurazione:
• Batch Size: 1
• Options: Reset (abilita)

Connessione:
FROM: "Filter Relevant" (output TRUE)
TO: "Split Into Batches"
```

**Scopo**: Processa ogni notizia rilevante una alla volta

---

### 2. Set: Create Platforms Array

**Add Node** → `set`

```
Configurazione:
• Name: "Create Platforms Array"
• Assignments:
  - Name: platforms
    Type: Array
    Value: =['linkedin', 'facebook', 'instagram', 'twitter']

Keep other fields: YES

Connessione:
FROM: "Split Into Batches"
TO: "Create Platforms Array"
```

---

### 3. Split Out: Loop Platforms

**Add Node** → `split out`

```
Configurazione:
• Field to Split Out: platforms

Connessione:
FROM: "Create Platforms Array"
TO: "Split Out Platforms"
```

**Scopo**: Crea 4 esecuzioni, una per ogni piattaforma

---

### 4. Set: Extract Platform

**Add Node** → `set`

```
Configurazione:
• Name: "Set Current Platform"
• Assignments:
  - Name: current_platform
    Type: String
    Value: ={{ $json.platforms }}

Keep other fields: YES

Connessione:
FROM: "Split Out Platforms"
TO: "Set Current Platform"
```

---

### 5. AI Agent: Content Creator ⭐

**Add Node** → `ai agent`

```
Configurazione Base:
• Name: "AI Agent Content Creator"

Options:
• System Message: (copia da AI-AGENT-SYSTEM-PROMPT.md - sezione Content Creator)

Connessione Main Flow:
FROM: "Set Current Platform"
TO: "AI Agent Content Creator"
```

---

### 6. Sub-Nodi AI Agent Content Creator

Aggiungi questi sub-nodi e collegali all'AI Agent #2:

#### A) Gemini LLM

**Add Node** → `google gemini` (LangChain)

```
Configurazione:
• Model: gemini-3-flash-preview
• Temperature: 0.7 (più creativo per content)
• Max Tokens: 2048
• Credential: UNSIC Gemini API

Connessione:
FROM: "Google Gemini"
TO: AI Agent porta "ai_languageModel"
```

#### B) Output Parser (JSON)

**Add Node** → `output parser structured`

```
Configurazione:
• Name: "Parse Content JSON"
• JSON Schema:
{
  "type": "object",
  "properties": {
    "text": {"type": "string"},
    "hashtags": {"type": "array"},
    "cta": {"type": "string"},
    "tone_used": {"type": "string"}
  },
  "required": ["text", "hashtags"]
}

Connessione:
FROM: "Parse Content JSON"
TO: AI Agent porta "ai_outputParser"
```

#### C) Tool: Generate Image (HTTP Request)

**Add Node** → `tool http request`

```
Configurazione:
• Name: generate_image
• Description: Generate professional category-specific images using Nano-Banana FLUX AI. Sizes: 1200x630 (social), 1080x1080 (Instagram)

• Method: POST
• URL: http://172.19.0.1:8100/api/generate
• Body (JSON):
  {
    "prompt": "{prompt}",
    "width": "{width|1200}",
    "height": "{height|630}",
    "model": "flux-schnell"
  }

Connessione:
FROM: "Tool HTTP Request"
TO: AI Agent porta "ai_tool"
```

#### D) Tool: Query Database (Workflow)

**Add Node** → `tool workflow`

```
Configurazione:
• Name: query_database
• Description: Query UNSIC database for context and related news
• Source Workflow: Tool: PostgreSQL Query UNSIC

Connessione:
FROM: "Tool Workflow"
TO: AI Agent porta "ai_tool"
```

#### E) Memory (Postgres)

**Add Node** → `postgres chat memory`

```
Configurazione:
• Credential: UNSIC PostgreSQL
• Table Name: ai_chat_memory
• Session ID: ={{ $json.session_id || 'content_creator' }}

Connessione:
FROM: "Postgres Chat Memory"
TO: AI Agent porta "ai_memory"
```

---

### 7. Set: Build Content Record

**Add Node** → `set`

```
Configurazione:
• Name: "Build Content Record"
• Assignments:
  - news_id: ={{ $('Set Current Platform').item.json.id }}
  - platform: ={{ $('Set Current Platform').item.json.current_platform }}
  - content_text: ={{ $json.text }}
  - hashtags: ={{ $json.hashtags }}
  - content_image_url: ={{ $json.image_url || '' }}
  - status: ready
  - category: ={{ $('Set Current Platform').item.json.category }}

Connessione:
FROM: "AI Agent Content Creator"
TO: "Build Content Record"
```

---

### 8. HTTP Request: Save to Database

**Add Node** → `http request`

```
Configurazione:
• Method: POST
• URL: https://unsic.fodivps1.cloud/api/content
• Send Body: YES
• Body Content Type: JSON

• JSON Body:
={{
  JSON.stringify({
    news_id: $json.news_id,
    platform: $json.platform,
    content_text: $json.content_text,
    hashtags: $json.hashtags,
    content_image_url: $json.content_image_url,
    status: 'ready',
    category: $json.category
  })
}}

Connessione:
FROM: "Build Content Record"
TO: "Save to Database"
```

---

### 9. Loop Back to Split Into Batches

```
Connessione:
FROM: "Save to Database"
TO: "Split Into Batches" (loop)

Questo processa tutte le 4 piattaforme per ogni news
```

---

### 10. Aggregate: Collect All Results

**Add Node** → `aggregate`

```
Configurazione:
• Aggregate By: All Items Data

Connessione:
FROM: "Split Into Batches" (quando loop completo)
TO: "Aggregate Results"
```

---

### 11. Set: Final Stats

**Add Node** → `set`

```
Configurazione:
• Name: "Build Final Stats"
• Assignments:
  - total_news_processed: ={{ $items().length / 4 }}
  - total_content_created: ={{ $items().length }}
  - platforms: ={{ ['linkedin', 'facebook', 'instagram', 'twitter'] }}
  - timestamp: ={{ $now.toISO() }}

Connessione:
FROM: "Aggregate Results"
TO: "Build Final Stats"
```

---

## 🎯 Connessioni Complete del Workflow

```
Schedule → RSS (x3) → Merge → Clean → AI Agent #1 → Filter ≥70
                                                           ↓
                                                    Split Batches
                                                           ↓
                                                    Create Platforms
                                                           ↓
                                                    Split Out (x4)
                                                           ↓
                                                    Set Platform
                                                           ↓
                                                    AI Agent #2
                                                    ├─ Gemini LLM
                                                    ├─ Output Parser
                                                    ├─ Tool: Generate Image
                                                    ├─ Tool: Query DB
                                                    └─ Memory: Postgres
                                                           ↓
                                                    Build Record
                                                           ↓
                                                    Save to DB
                                                           ↓
                                                    Loop back ──┐
                                                                │
                                                    Aggregate ←─┘
                                                           ↓
                                                    Final Stats
```

---

## 📝 System Prompt per AI Agent #2 (Content Creator)

**Location**: `/var/www/projects/unsic/n8n-workflows/AI-AGENT-SYSTEM-PROMPT.md`

Copia la sezione **"System Prompt - Content Creator Agent"** e incollala in:
```
AI Agent Content Creator → Options → System Message
```

---

## ✅ Risultato Finale

Ogni notizia rilevante (score ≥ 70) genererà:
- ✅ 4 post social (LinkedIn, Facebook, Instagram, Twitter)
- ✅ 4 immagini ottimizzate (dimensioni per piattaforma)
- ✅ Tutto salvato in `unsic_content` con status "ready"

**Output previsto**: 5 news × 4 platforms = **20 contenuti pronti** ogni giorno!

---

**Prossimo Step**: Aggiungi i nodi nel canvas seguendo la sequenza sopra (11 nodi totali).
