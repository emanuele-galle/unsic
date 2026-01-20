# 🛠️ Configurare Tools (Sub-Nodi) per AI Agent in N8N

**Workflow**: UNSIC News with AI Agent (ID: JE5iydikZSALEy4I)

---

## 🎯 Cosa sono i Sub-Nodi dell'AI Agent

I **sub-nodi** sono "strumenti" che l'AI Agent può decidere autonomamente di usare quando necessario.

### Come Funzionano:

```
┌─────────────────────────────────────────────────────────┐
│                      AI Agent                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │ L'utente chiede: "Ci sono già notizie su fisco?" │ │
│  │                                                    │ │
│  │ AI Agent pensa:                                    │ │
│  │ → "Ho bisogno di interrogare il database"         │ │
│  │ → "Uso il Tool: query_database"                   │ │
│  │ → Esegue query PostgreSQL                         │ │
│  │ → Riceve risultato: "5 notizie trovate"          │ │
│  │ → Risponde: "Sì, ci sono 5 notizie su fisco"     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  TOOLS DISPONIBILI (Sub-Nodi):                          │
│  • query_database ← Workflow PostgreSQL                 │
│  • generate_image ← Workflow Nano-Banana                │
│  • canva_design ← MCP Canva (se configurato)            │
└─────────────────────────────────────────────────────────┘
```

**L'AI Agent decide QUANDO usare ogni Tool in base al contesto!**

---

## Come Aggiungere Tools all'AI Agent

### 1. Apri il Workflow in N8N

```
https://n8n.fodivps1.cloud → "UNSIC News with AI Agent"
```

### 2. Visualizzazione Canvas

Il nodo **AI Agent** ha porte di connessione sulla sinistra per i sub-nodi:

```
          Sub-Nodi (Sulla Sinistra)              AI Agent
         ┌──────────────────┐
         │                  │
  ┌──────┤ Gemini LLM       ├──────┐
  │      │ (Chat Model)     │      │          ┌─────────────┐
  │      └──────────────────┘      ├─────────▶│             │
  │                                 │   ai_    │             │
  │      ┌──────────────────┐      │language  │             │
  ├──────┤ Prompt Template  ├──────┤  Model   │             │
  │      │ (System Prompt)  │      │          │  AI Agent   │
  │      └──────────────────┘      ├─────────▶│             │
  │                                 │ ai_      │             │
  │      ┌──────────────────┐      │ prompt   │             │
  ├──────┤ Output Parser    ├──────┤          │             │
  │      │ (JSON)           │      ├─────────▶│             │
  │      └──────────────────┘      │ ai_      │             │
  │                                 │ output   │             │
  │      ┌──────────────────┐      │ Parser   └─────────────┘
  ├──────┤ Tool: Query DB   ├──────┤
  │      └──────────────────┘      ├─────────▶ ai_tool
  │                                 │
  │      ┌──────────────────┐      │
  ├──────┤ Tool: NanoBanana ├──────┤
  │      └──────────────────┘      ├─────────▶ ai_tool
  │                                 │
  │      ┌──────────────────┐      │
  └──────┤ Memory (Optional)├──────┴─────────▶ ai_memory
         └──────────────────┘
```

### 3. Aggiungere Sub-Nodi Tools

**Nel canvas N8N:**

1. Cerca nel pannello nodi: **"Tool"** o **"@n8n/n8n-nodes-langchain.tool"**
2. Trascina i nodi Tools nel canvas
3. Collega alla porta **ai_tool** dell'AI Agent (freccia sinistra del nodo AI Agent)

### 3. Aggiungi Tool: PostgreSQL Database

#### Metodo A: Workflow Tool (Consigliato ✅)

**Click "Add Tool" → Seleziona "Call n8n Workflow Tool"**

```
┌─────────────────────────────────────────────────┐
│  Tool Configuration                              │
├─────────────────────────────────────────────────┤
│                                                  │
│  Workflow to Call:                              │
│  ▼ Tool: PostgreSQL Query UNSIC                 │
│                                                  │
│  Name (ID che l'AI userà):                      │
│  query_database                                  │
│                                                  │
│  Description (spiega all'AI cosa fa):           │
│  Query the UNSIC PostgreSQL database to:        │
│  - Check if news already exists (by link)       │
│  - Get statistics (count by category)           │
│  - Retrieve recent news                         │
│  - Verify duplicates                            │
│                                                  │
│  Example queries the AI can run:                │
│  - SELECT COUNT(*) FROM unsic_news              │
│    WHERE category='fisco'                       │
│  - SELECT * FROM unsic_news                     │
│    WHERE link='...' LIMIT 1                     │
│                                                  │
│  [Save]                                         │
└─────────────────────────────────────────────────┘
```

**Perché Workflow Tool?**
- Più sicuro (controllo sulle query)
- Più flessibile (puoi aggiungere validazione)
- Più facile da debuggare

#### Metodo B: Postgres Tool Diretto

Se usi **Postgres Tool diretto**:
```
Connection:
• Host: localhost
• Port: 5439
• Database: unsic_db
• User: unsic_user
• Password: [dalla .env]

Tool Config:
• Name: "query_unsic_db"
• Description: "Query the UNSIC PostgreSQL database to check existing news, get statistics, or retrieve news data"
```

Se usi **Workflow Tool** (consigliato):
1. Crea prima un sub-workflow "UNSIC_DB_Query_Tool" con:
   - Webhook Trigger
   - Postgres Query node
   - Webhook Response

2. Poi aggiungi Tool:
   ```
   Type: Call n8n Workflow Tool
   Workflow: UNSIC_DB_Query_Tool
   Name: query_unsic_db
   Description: Query UNSIC database for news data
   ```

### 4. Aggiungi Tool: Nano-Banana Image Generation

**Click "Add Tool" → "Call n8n Workflow Tool"**

```
┌─────────────────────────────────────────────────┐
│  Tool Configuration                              │
├─────────────────────────────────────────────────┤
│                                                  │
│  Workflow to Call:                              │
│  ▼ Tool: NanoBanana Image Generator             │
│                                                  │
│  Name:                                          │
│  generate_image                                  │
│                                                  │
│  Description:                                   │
│  Generate professional images using Nano-Banana │
│  FLUX AI model. Supports:                       │
│  - Custom prompts for news categories           │
│  - Multiple sizes (1200x630, 1080x1080, etc.)  │
│  - Fast generation (flux-schnell model)         │
│                                                  │
│  The AI can call this when it needs to:         │
│  - Create visual content for news               │
│  - Generate social media graphics               │
│  - Produce category-specific imagery            │
│                                                  │
│  Input: {prompt: string, width?: number,        │
│          height?: number}                       │
│  Output: {image_url: string}                    │
│                                                  │
│  [Save]                                         │
└─────────────────────────────────────────────────┘
```

**Il workflow Tool è già importato in N8N!**
- Workflow: "Tool: NanoBanana Image Generator" (ID: 0pvYqincJJFK45ip)
- Webhook: `/webhook/tool-nanobanana`
- API: `http://172.19.0.1:8100/api/generate`

Prima crea sub-workflow "NanoBanana_Image_Tool" (già fatto ✅):

```json
{
  "name": "NanoBanana Image Tool",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "nanobanana-generate"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "http://172.19.0.1:8100/api/generate",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {"name": "prompt", "value": "={{ $json.body.prompt }}"},
            {"name": "width", "value": 1200},
            {"name": "height", "value": 630},
            {"name": "model", "value": "flux-schnell"}
          ]
        }
      }
    },
    {
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "responseBody": "={{ $json }}"
      }
    }
  ]
}
```

Poi nell'AI Agent aggiungi Tool:
```
Type: Call n8n Workflow Tool
Workflow: NanoBanana_Image_Tool
Name: generate_image_nanobanana
Description: Generate professional images for news using Nano-Banana FLUX AI (1200x630 or 1080x1080)
```

### 5. Aggiungi Tool: Canva MCP (se disponibile)

**Click "Add Tool" → Cerca "MCP"**

Se trovi **MCP Client Tool**:
```
MCP Server: canva (se configurato)
Tool Name: generate_canva_design
Description: Create designs using Canva templates for UNSIC categories
```

**NOTA**: Per usare Canva MCP devi prima configurarlo in N8N:
1. Settings → MCP Servers
2. Add Canva MCP Server
3. API Key Canva

**Alternativa** (senza MCP): Crea Workflow Tool con HTTP a Canva API.

---

## Struttura Finale AI Agent

```
AI Agent News Analyzer
├─ Language Model: Google Gemini 2.0 Flash
├─ Prompt: System prompt UNSIC
├─ Output Parser: Structured JSON
└─ Tools:
   ├─ query_unsic_db (Postgres o Workflow)
   ├─ generate_image_nanobanana (Workflow)
   └─ generate_canva_design (MCP o Workflow)
```

---

## Test dei Tools

Una volta configurati i Tools, l'AI Agent potrà:

1. **Verificare duplicati**: "Check if this news already exists in database"
2. **Generare immagini**: "Generate a professional image for this fisco news"
3. **Query stats**: "How many news we have in category agricoltura?"

---

## Alternative: Sub-Workflows Pronti

Ho preparato 2 sub-workflow pronti da importare che puoi usare come Tools:

### File da scaricare e importare:

**File Manager** → `/var/www/projects/unsic/n8n-workflows/tools/`

1. `Tool_Query_UNSIC_DB.json` - PostgreSQL query tool
2. `Tool_Generate_Image_NanoBanana.json` - Image generation tool
3. `Tool_Canva_Generate.json` - Canva design tool (richiede API key)

Importa questi 3 workflow, poi aggiungi all'AI Agent come "Call n8n Workflow Tool".

---

---

## 📚 Lista Completa Nodi Tool Disponibili in N8N

Cerca questi nodi nel pannello N8N (Add Node → cerca "tool"):

### Tools per Database e API:

| Nodo | Package | Descrizione |
|------|---------|-------------|
| **Tool Workflow** | `@n8n/n8n-nodes-langchain.toolWorkflow` | Chiama un altro workflow N8N come tool |
| **Tool HTTP Request** | `@n8n/n8n-nodes-langchain.toolHttpRequest` | Esegue chiamate HTTP/API |
| **Tool Code** | `@n8n/n8n-nodes-langchain.toolCode` | Esegue codice JavaScript custom |

### Tools per Ricerca e Dati:

| Nodo | Package | Uso per UNSIC |
|------|---------|---------------|
| **Vector Store Tool** | `@n8n/n8n-nodes-langchain.toolVectorStore` | Query semantic search su notizie archiviate |
| **Calculator** | `@n8n/n8n-nodes-langchain.toolCalculator` | Calcoli statistici su metriche news |
| **Wikipedia** | `@n8n/n8n-nodes-langchain.toolWikipedia` | Context aggiuntivo per notizie |

### Tools per Integrazioni:

| Nodo | Package | Uso per UNSIC |
|------|---------|---------------|
| **MCP Client Tool** | `@n8n/n8n-nodes-langchain.toolMcp` | Canva MCP per design automation |
| **Airtable Tool** | (se disponibile) | Gestione database alternativo |

---

## 🎯 Configurazione Raccomandata per UNSIC

### AI Agent "News Analyzer" - Sub-Nodi Consigliati:

```
AI Agent News Analyzer
├─ ai_languageModel → Gemini 2.0 Flash (già fatto ✅)
├─ ai_prompt → System Prompt UNSIC (già fatto ✅)
├─ ai_outputParser → JSON Parser (già fatto ✅)
├─ ai_tool #1 → Tool Workflow: "PostgreSQL Query UNSIC"
├─ ai_tool #2 → Tool HTTP Request: Nano-Banana API
├─ ai_tool #3 → Tool MCP: Canva (se configurato)
└─ ai_memory → (Opzionale) Buffer Memory per context
```

### Come Aggiungere Tool #1: PostgreSQL (Tool Workflow)

**Nel canvas:**

1. Click "Add Node" → Cerca: `tool workflow`
2. Trascina nodo **"Call n8n Workflow Tool"** nel canvas
3. Clicca sul nodo appena creato
4. Configura:
   ```
   Source Workflow: Tool: PostgreSQL Query UNSIC
   Name: query_database
   Description: Query UNSIC PostgreSQL to check duplicates, stats, or retrieve news
   ```
5. **Collega** il nodo alla porta **ai_tool** dell'AI Agent:
   - Trascina connettore DA "Call n8n Workflow Tool"
   - A porta sinistra AI Agent (cerchio piccolo etichettato "ai_tool")

### Come Aggiungere Tool #2: Nano-Banana (Tool HTTP Request)

**Nel canvas:**

1. Click "Add Node" → Cerca: `tool http`
2. Trascina nodo **"Tool HTTP Request"**
3. Configura:
   ```
   Name: generate_image
   Description: Generate professional images using Nano-Banana FLUX AI.
                Supports custom prompts and sizes (1200x630 for social media).

   Method: POST
   URL: http://172.19.0.1:8100/api/generate

   Body Parameters:
   • prompt: {prompt}
   • width: {width|1200}
   • height: {height|630}
   • model: flux-schnell
   ```
4. **Collega** alla porta **ai_tool** dell'AI Agent

### Come Aggiungere Tool #3: Canva MCP (Tool MCP Client)

**Se hai Canva MCP configurato:**

1. Click "Add Node" → Cerca: `mcp`
2. Trascina nodo **"MCP Client Tool"**
3. Configura:
   ```
   MCP Server: canva (seleziona dal dropdown)
   Tool Name: create_canva_design
   Description: Create professional designs using Canva templates.
                Category-specific templates for UNSIC news (fisco, lavoro, etc.)
   ```
4. **Collega** alla porta **ai_tool** dell'AI Agent

---

## 🔍 Esempio Pratico: AI Agent con Tools in Azione

### Scenario: L'AI Agent analizza una notizia su agevolazioni fiscali

```
1. AI riceve RSS item: "Nuove agevolazioni per startup agricole"

2. AI pensa: "Devo verificare se esiste già questa notizia"
   → Usa Tool: query_database
   → Query: SELECT * FROM unsic_news WHERE link = '...'
   → Risultato: "0 risultati" (notizia nuova)

3. AI pensa: "È una notizia rilevante, score 85, categoria: fisco"
   → Analisi interna con Gemini LLM

4. AI pensa: "Devo generare un'immagine per questa notizia fiscale"
   → Usa Tool: generate_image
   → Prompt: "Professional tax incentive graphic, calculator icon, blue colors, UNSIC branding"
   → Risultato: image_url ricevuto

5. AI restituisce:
   {
     "score": 85,
     "category": "fisco",
     "summary": "...",
     "image_url": "http://172.19.0.1:8100/output/img_123.png",
     "already_exists": false
   }
```

**L'AI ha usato 2 Tools autonomamente senza istruzioni esplicite!**

---

## 🧪 Test dei Tools Configurati

Dopo aver collegato i Tools, testa nell'editor N8N:

### Test 1: Verifica Tool Database

```
Input RSS: Qualsiasi notizia
AI Agent dovrebbe:
1. Usare query_database per check duplicati
2. Loggare: "Checking database for duplicates..."
3. Procedere con analysis se non esiste
```

### Test 2: Verifica Tool Image Generation

```
Aggiungi al System Prompt: "Generate an image for every news"
AI Agent dovrebbe:
1. Analizzare la notizia
2. Usare generate_image con prompt appropriato
3. Includere image_url nel risultato
```

### Test 3: Verifica Decisioni Autonome

```
Aggiungi al System Prompt: "Use tools only when necessary"
AI Agent dovrebbe:
- NON usare generate_image per ogni notizia
- Usare query_database SOLO se chiesto o per duplicati
- Decidere autonomamente basandosi sul contesto
```

---

## 💾 Memory Configuration (Opzionale)

Per dare memoria conversazionale all'AI Agent:

1. Aggiungi nodo **"Buffer Memory"** o **"Window Buffer Memory"**
2. Collega alla porta **ai_memory** dell'AI Agent
3. Config:
   ```
   Session Key: ={{ $json.session_id || 'default' }}
   Context Window Size: 10 (ultimi 10 messaggi)
   ```

**Utile per**: Conversazioni multi-step, context tra diverse notizie

---

## 🚨 Troubleshooting

### Tool non viene chiamato dall'AI Agent

**Causa**: Description non chiara

**Soluzione**: Rendi la description più specifica:
```
❌ "Query database"
✅ "Query the UNSIC PostgreSQL database to check if a news article
    already exists by URL, or get statistics by category"
```

### Tool ritorna errore

**Verifica**:
1. Test il Tool workflow standalone (Execute Workflow)
2. Controlla logs del Tool workflow
3. Verifica credenziali (PostgreSQL, API keys)

### AI Agent non usa Tools anche quando dovrebbe

**Causa**: System Prompt non menziona i Tools

**Soluzione**: Aggiungi al System Prompt:
```
"Hai accesso a questi Tools:
- query_database: per verificare duplicati e statistiche
- generate_image: per creare grafiche professionali
Usali quando necessario per completare il task."
```

---

**Prossimo Step**: Aggiungi i Tools nel canvas e testa!
