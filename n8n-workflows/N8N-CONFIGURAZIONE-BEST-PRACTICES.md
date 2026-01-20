# 🎯 N8N Workflow - Best Practices e Configurazioni Corrette

**Basato su**: UNSIC News Automation - Lezioni apprese durante setup

**Data**: 2025-12-03

---

## 📋 Checklist Configurazione Workflow N8N

### Nodi Comuni

#### 1. **Merge** (Combinare feed RSS multipli)

```
✅ CORRETTO:
Mode: Append

❌ ERRORE:
Mode: Combine → Combination Mode: Multiplex
(richiede Fields to Match che creano confusione)
```

---

#### 2. **Split Out** (Loop su array)

```
✅ CORRETTO:
Fields To Split Out: platforms
(digitare il nome del campo array)

❌ ERRORE:
Lasciare vuoto → "You need to define field"
```

---

#### 3. **Sort** (Ordinare items)

```
✅ CORRETTO:
Type: Simple
Fields To Sort By:
  • Field Name: score
  • Order: Descending

❌ ERRORE:
Lasciare vuoto → "No sorting specified"
```

**IMPORTANTE**: Il campo (es: `score`) deve esistere nell'input!

---

#### 4. **Set** (Parse o trasforma dati)

```
✅ CORRETTO (Expressions):
Mode: Manual Mapping

Assignment:
  Name: score
  Type: Number (o String se conversion issues)
  Value: {{ $json.output.score }}
  (NO = iniziale!)

Options:
  Keep Only Set Fields: NO
  (mantiene campi dal nodo precedente)

❌ ERRORI COMUNI:
• Value: ={{ $json.score }} (= extra causa errore tipo)
• Value: {{ JSON.parse($json.output) }} (se output è già oggetto)
• Keep Only Set Fields: YES (perde campi precedenti)
```

---

### AI Agent Configuration

#### 5. **AI Agent Node**

```
✅ CORRETTO:

Parameters:
  Prompt (User Message):
    {{ $json.title }}

    {{ $json.description }}

  (Dati della notizia da analizzare)

Options:
  System Message:
    [Inserire qui il prompt lungo con ruolo, istruzioni, format]

  Require Specific Output Format: YES ✅
  (Forza output JSON strutturato)

Sub-Nodi Collegati:
  ai_languageModel → Gemini LLM
  ai_outputParser → Structured Output Parser
  ai_tool → Tools (query_database, generate_image, etc.)
  ai_memory → Postgres Memory (opzionale)
```

**System Prompt Best Practices**:
- Inizio: "CRITICAL: Respond ONLY with valid JSON. NO markdown."
- Definire categorie, pilastri, scoring
- Elencare Tools disponibili e QUANDO usarli
- Specificare OUTPUT FORMAT con esempio JSON
- Fine: "REMEMBER: Only raw JSON, no code blocks"

---

#### 6. **Gemini LLM (Sub-Nodo)**

```
✅ CORRETTO:

Credential: Google Gemini(PaLM) Api
  Host: https://generativelanguage.googleapis.com
  API Key: [KEY VALIDA - verificare non scaduta!]

Model: models/gemini-3-flash-preview
(Gemini 3 Flash - Dicembre 2025)

Options:
  Temperature: 0.3 (analyzer) / 0.7 (content creator)
  Max Output Tokens: 1024 (analyzer) / 2048 (creator)

Connessione:
  DA: Gemini LLM
  A: Porta "ai_languageModel" dell'AI Agent
```

**⚠️ ATTENZIONE**:
- API Key può scadere → Test periodicamente
- Errore "API key expired" → Genera nuova su https://aistudio.google.com/apikey

---

#### 7. **Structured Output Parser (Sub-Nodo)**

```
✅ CORRETTO:

JSON Schema:
{
  "type": "object",
  "properties": {
    "score": {"type": "number"},
    "category": {"type": "string"},
    "title": {"type": "string"},
    "summary": {"type": "string"},
    "why_relevant": {"type": "string"},
    "target_audience": {"type": "array"},
    "urgency": {"type": "string"},
    "tags": {"type": "array"},
    "already_exists": {"type": "boolean"}
  },
  "required": ["score", "category", "summary"]
}

Connessione:
  DA: Output Parser
  A: Porta "ai_outputParser" dell'AI Agent
```

**Output AI Agent con Output Parser**:
```json
{
  "output": {
    "score": 86,
    "category": "impresa",
    ...
  }
}
```

I campi sono **dentro `output`**, non al livello root!

---

#### 8. **Tools (Sub-Nodi)**

##### Tool Workflow

```
✅ CORRETTO:

Type: Call n8n Workflow Tool

Configuration:
  Name: query_database
  Description: "Query UNSIC PostgreSQL database to check duplicates, get statistics, or retrieve news. Use SELECT queries."

  Source Workflow: Tool: PostgreSQL Query UNSIC
  (il workflow Tool deve avere Execute Workflow Trigger!)

Connessione:
  DA: Tool Workflow
  A: Porta "ai_tool" dell'AI Agent (multipli)
```

**⚠️ IMPORTANTE**:
- Il workflow chiamato deve iniziare con **"Execute Workflow Trigger"** (NO Webhook!)
- Nel trigger, definire Fields (es: "query" tipo String)
- Click ✨ sui parametri per permettere all'AI di settarli

##### Tool HTTP Request

```
✅ CORRETTO:

Type: Tool HTTP Request

Configuration:
  Name: generate_image
  Description: "Generate professional images using Nano-Banana FLUX AI. Sizes: 1200x630 social, 1080x1080 Instagram."

  Method: POST
  URL: http://172.19.0.1:8100/api/generate

  Send Body: JSON
  Body:
    {
      "prompt": "{prompt}",
      "width": "{width|1200}",
      "height": "{height|630}",
      "model": "flux-schnell"
    }

Connessione:
  DA: Tool HTTP Request
  A: Porta "ai_tool" dell'AI Agent
```

---

#### 9. **Postgres Chat Memory (Sub-Nodo)** - OPZIONALE

```
✅ CORRETTO:

Credential: UNSIC PostgreSQL
  Host: 172.19.0.1  ← IP Gateway Docker (NON localhost!)
  Port: 5439  ← Porta esposta (NON 5432 interna!)
  Database: unsic_db
  User: unsic_user
  Password: fqu0qhNOMdULpoHZETXAvALzhiQ2aAcI
  SSL: Disable

Table Name: ai_chat_memory
(tabella già creata in DB)

Session Key Expression: news_analyzer
(o {{ $json.session_id || 'default' }})

Connessione:
  DA: Postgres Memory
  A: Porta "ai_memory" dell'AI Agent
```

**⚠️ NETWORK DOCKER**:
- N8N è in container Docker
- PostgreSQL è in container Docker
- localhost NON funziona tra containers!
- Usare 172.19.0.1 (gateway) o IP container
- Porta: quella ESPOSTA sull'host (5439), non interna (5432)

**Se Memory causa problemi**:
- Rimuovila temporaneamente (è opzionale)
- Usa "Simple Memory" (zero config, ma non persistente)

---

### Workflow-Specific

#### 10. **RSS Feed Read**

```
✅ CORRETTO:

URL fonti affidabili:
  • ANSA Economia: https://www.ansa.it/sito/notizie/economia/economia_rss.xml
  • Il Sole 24 Ore: https://www.ilsole24ore.com/rss/economia.xml
  • Confagricoltura: https://www.confagricoltura.it/ita/rss/notizie.xml

❌ ERRORI:
  • Governo IT: https://www.governo.it/rss → 404 o XML malformed
    Fix: https://www.governo.it/it/feed
```

**Timeout**: 30000ms (30 secondi) per feed lenti

---

#### 11. **Filter** (Condizioni)

```
✅ CORRETTO (Filter Score):

Conditions:
  Type: Number
  Field: score
  Operation: Larger Than or Equal
  Value: 70

✅ CORRETTO (Filter Last 24h):

Conditions:
  Type: Date & Time
  Field: {{ $json.isoDate }}
  Operation: After
  Value: {{ $now.minus({hours: 24}).toISO() }}
```

---

#### 12. **HTTP Request** (Save to DB)

```
✅ CORRETTO:

Method: POST
URL: https://unsic.fodivps1.cloud/api/news

Send Body: YES
Body Content Type: JSON

JSON Body (Expression):
={{
  JSON.stringify({
    category: $json.category,
    pillar: $json.pillar || 'tutela_imprenditorialita',
    rank: $json.rank,
    title: $json.title,
    summary: $json.summary,
    why_relevant: $json.why_relevant,
    source: $('Clean Data').item.json.source_feed,
    link: $('Clean Data').item.json.link,
    article_id: $('Clean Data').item.json.link,
    status: 'pending_approval'
  })
}}
```

**IMPORTANTE**:
- Usare `$('Nome Nodo').item.json.campo` per dati da nodi precedenti
- Usare `$json.campo` per dati dal nodo immediatamente precedente
- Wrappare in `JSON.stringify()` per body JSON
- Usare `={{  }}` per expressions (con = iniziale qui!)

---

### Troubleshooting Comuni

#### Errore: "Connection refused" (Postgres)

```
❌ Host: localhost
✅ Host: 172.19.0.1 (gateway Docker)

❌ Port: 5432 (interna container)
✅ Port: 5439 (esposta su host)
```

---

#### Errore: "API key expired" (Gemini)

```
Soluzione:
1. https://aistudio.google.com/apikey
2. Generate new key
3. Update in N8N credential
4. Update in /home/shared/secrets/api-keys.env
```

---

#### Errore: "No prompt specified" (AI Agent)

```
Inserire in:
AI Agent → Options → System Message
(NON nel campo Prompt principale)
```

---

#### Errore: "Couldn't find field X" (Sort/Filter)

```
Causa: Il campo non esiste nell'input del nodo

Debug:
1. Click nodo precedente
2. Verifica output ha il campo
3. Se manca, aggiungere nodo Set per crearlo
```

---

#### Errore: "Missing Execute Workflow Trigger" (Tool)

```
Tool Workflow deve iniziare con:
❌ Webhook Trigger
✅ Execute Workflow Trigger

Nel trigger:
• Definire Fields (es: query, prompt, etc.)
• Click ✨ sui parametri che l'AI può settare
```

---

#### AI Agent restituisce testo invece di JSON

```
Fix:
1. AI Agent → Require Specific Output Format: YES
2. Collegare Structured Output Parser
3. System Prompt: "CRITICAL: Respond ONLY with JSON, NO markdown"
4. Gemini Options → Temperature bassa (0.3) per consistenza
```

---

#### Parsing output AI Agent

```
Output AI Agent con Parser:
{
  "output": { "score": 86, "category": "fisco" }
}

Parse in nodo Set:
{{ $json.output.score }}  ✅ (già oggetto)
{{ JSON.parse($json.output).score }}  ❌ (se già oggetto)
```

---

## 📊 Template Workflow Testato

### Workflow: News Analysis con AI Agent

```
Schedule Trigger (cron: 0 7 * * *)
  ↓
RSS Feed Read (x2-3 fonti parallele)
  ↓
Merge (Mode: Append)
  ↓
Filter Last 24h (dateTime condition)
  ↓
Clean Data (Set: estrai title, description, link)
  ↓
Limit (Max 10 per test veloci)
  ↓
AI Agent News Analyzer
├─ Gemini LLM (credential verificata, model gemini-3-flash-preview)
├─ Structured Output Parser (JSON schema con campi required)
├─ Tool: generate_image (HTTP Request a Nano-Banana)
└─ Tool: query_database (Workflow con Execute Trigger) - OPZIONALE
  ↓
Parse AI Output (Set: estrai $json.output.* → campi root)
  ↓
Filter Score ≥ 70
  ↓
Sort by Score (Descending)
  ↓
Limit Top 10
  ↓
Add Rank (Include Other Fields: YES)
  ↓
HTTP Request: Save to DB (POST /api/news, status: pending_approval)
  ↓
Stats/Response
```

---

## 🔑 Credentials da Configurare

### Google Gemini API

```
Type: Google Gemini(PaLM) Api

Host: https://generativelanguage.googleapis.com
API Key: [Generare su aistudio.google.com]
SSL: Default

⚠️ Verificare validità ogni 60 giorni!
```

### PostgreSQL (per Memory)

```
Type: Postgres

Host: 172.19.0.1  ← Gateway Docker!
Port: 5439  ← Porta ESPOSTA (non 5432)
Database: unsic_db
User: unsic_user
Password: fqu0qhNOMdULpoHZETXAvALzhiQ2aAcI
SSL: Disable

Table (per Memory): ai_chat_memory
```

---

## 🎨 System Prompts Template

### News Analyzer Agent

**Location**: AI Agent → Options → System Message

**Struttura**:
```
⚠️ CRITICAL: Respond ONLY with valid JSON. NO markdown, NO code blocks.

[Ruolo e Missione]
Sei l'AI News Analyst di UNSIC...

[Categorie e Pilastri]
CATEGORIE: fisco, lavoro, agricoltura, pnrr, made_in_italy, impresa
PILASTRI: ...

[Scoring System]
SCORING (0-100):
• Criterio 1 (Xpt)
• Criterio 2 (Xpt)
THRESHOLD: ≥ 70 = RILEVANTE

[Tools Disponibili]
TOOLS:
1. query_database - Quando usarlo, come usarlo
2. generate_image - Quando usarlo, parametri

[Output Format]
OUTPUT JSON:
{
  "score": number,
  "category": "string",
  ...
}

[Best Practices]
REMEMBER: Only raw JSON. No explanations.
```

**Prompt ottimizzato**: `/var/www/projects/unsic/n8n-workflows/AI-AGENT-SYSTEM-PROMPT.md`

---

### Content Creator Agent

**Location**: AI Agent Content Creator → Options → System Message

**Differenze da Analyzer**:
- Temperature più alta (0.7 vs 0.3)
- Focus su tone per piattaforma
- Linee guida specifiche LinkedIn/FB/IG/TW
- Output: {text, hashtags, cta}

---

## 🛠️ Tool Workflows - Struttura Corretta

### Tool: PostgreSQL Query

```
Workflow Name: Tool: PostgreSQL Query UNSIC

Nodes:
1. Execute Workflow Trigger  ← NON Webhook!
   Fields:
     • query (String) - ✨ Allow AI to fill

2. Postgres Node
   Operation: Execute Query
   Query: {{ $json.query }}  ← ✨ Allow AI to fill
   Credential: UNSIC PostgreSQL

3. Respond to Workflow (o ultimo nodo)
   Return: {{ $json }}

Active: YES
```

### Tool: Image Generator

```
Opzione A - Tool HTTP Request (diretto):
  Configurato direttamente come sub-nodo AI Agent
  (vedi sezione Tools sopra)

Opzione B - Tool Workflow:
  1. Execute Workflow Trigger
     Fields: prompt, width, height
  2. HTTP Request → Nano-Banana API
  3. Respond to Workflow
```

---

## 🚨 Errori da Evitare

### ❌ Connection Issues

```
localhost in Docker → 172.19.0.1
Porta interna container → Porta esposta host
API key vecchia → Rigenerare
```

### ❌ Data Loss in Pipeline

```
Set/Add Rank senza "Include Other Fields"
→ Perde campi dai nodi precedenti

Fix: Include Other Fields: YES
```

### ❌ Parsing Issues

```
JSON.parse() su oggetto già parsato → null
{{ = $json.field }} (= extra in expressions) → type error

Fix: {{ $json.field }} (senza = per values in Set)
     ={{ $json.field }} (con = per expressions in altri contesti)
```

### ❌ AI Agent Output Format

```
AI restituisce testo/markdown invece di JSON

Fix:
1. Require Specific Output Format: YES
2. Output Parser collegato
3. System Prompt strict (NO markdown)
```

---

## 📝 Checklist Pre-Deploy

Prima di attivare un workflow production:

- [ ] Tutte le credentials valide e testate
- [ ] System Prompt inserito e ottimizzato
- [ ] Output Parser collegato (se AI Agent)
- [ ] Tools configurati correttamente (Execute Trigger)
- [ ] Memory configurata (Postgres o Simple)
- [ ] Limit aggiunto per evitare overload
- [ ] Error handling (IF nodes, fallback)
- [ ] Test manuale completato con successo
- [ ] Verificato output in database
- [ ] Schedule/Webhook configurato correttamente
- [ ] Logs monitorati (nessun errore critico)

---

## 🔗 Riferimenti

- **System Prompts**: `/var/www/projects/unsic/n8n-workflows/AI-AGENT-SYSTEM-PROMPT.md`
- **Architettura**: `/var/www/projects/unsic/n8n-workflows/ARCHITETTURA-CON-APPROVAZIONE.md`
- **Guide Tools**: `/var/www/projects/unsic/n8n-workflows/GUIDA-AI-AGENT-TOOLS.md`
- **Credentials Server**: `/home/shared/secrets/api-keys.env`
- **N8N Dashboard**: https://n8n.fodivps1.cloud
- **Google AI Studio**: https://aistudio.google.com/apikey

---

**Documento vivo - Aggiornare con nuove lezioni apprese!**
