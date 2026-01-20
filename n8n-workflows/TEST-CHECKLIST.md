# UNSIC N8N Workflows - Test Checklist

**Version:** v3.0
**Date:** 2025-12-03

## Pre-Import Tests

### 1. Database Connection

```bash
# Test PostgreSQL connection
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -c "SELECT NOW();"
```

- [ ] Database responds
- [ ] Tables exist: `unsic_news`, `unsic_content`, `unsic_analytics`, `unsic_logs`

### 2. API Endpoints

```bash
# Test GET /api/news
curl -s https://unsic.fodivps1.cloud/api/news | jq '.success'

# Test GET /api/content
curl -s https://unsic.fodivps1.cloud/api/content | jq '.success'

# Test GET /api/news/:id (use existing ID)
NEWS_ID=$(docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -t -c "SELECT id FROM unsic_news LIMIT 1;" | xargs)
curl -s "https://unsic.fodivps1.cloud/api/news/$NEWS_ID" | jq '.id'
```

- [ ] `/api/news` returns success
- [ ] `/api/content` returns success
- [ ] `/api/news/:id` returns single news

### 3. External Services

```bash
# Test Google Gemini API
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=$GOOGLE_GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Test"}]}]}' \
  | jq '.candidates[0].content.parts[0].text'

# Test Nano-Banana
curl -s http://172.19.0.1:8100/health | jq '.status'

# Test RSS feeds
curl -s "https://www.ansa.it/sito/notizie/economia/economia_rss.xml" | grep "<item>" | wc -l
```

- [ ] Gemini API responds (not 401)
- [ ] Nano-Banana status: "healthy"
- [ ] RSS feeds return items (> 0)

---

## Post-Import Tests

### Workflow 1: News Intelligence

#### Test 1.1: Manual Execution

**Steps:**
1. Apri N8N: https://n8n.fodivps1.cloud
2. Apri workflow "UNSIC News Intelligence v3"
3. Click **Execute Workflow**
4. Attendi 30-60 secondi

**Expected:**
- [ ] Execution status: Success
- [ ] RSS nodes return items (>0 each)
- [ ] Merge node combines feeds
- [ ] Filter reduces count (last 24h only)
- [ ] Gemini node returns JSON analysis
- [ ] Filter removes low scores (<70)
- [ ] Limit node outputs max 5 items
- [ ] Save to DB succeeds

**Verify DB:**
```bash
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT COUNT(*) FROM unsic_news WHERE created_at > NOW() - INTERVAL '5 minutes';"
```

- [ ] New records inserted (1-5)

#### Test 1.2: Schedule Trigger

**Steps:**
1. Attiva workflow (toggle switch)
2. Attendi 1 ora (o modifica cron per test rapido)

**Verify:**
```bash
# Check N8N executions log
# (via UI → Executions tab)

# Check DB growth
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*) FROM unsic_news GROUP BY hour ORDER BY hour DESC LIMIT 24;"
```

- [ ] Hourly executions visible in N8N
- [ ] DB records grow hourly

---

### Workflow 2: Content Factory

#### Test 2.1: Webhook Trigger (Single News)

**Prerequisite:** At least 1 news in DB

**Steps:**
```bash
# Get news ID
NEWS_ID=$(docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -t -c "SELECT id FROM unsic_news WHERE status='pending' LIMIT 1;" | xargs)

# Trigger webhook
curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-content-factory \
  -H "Content-Type: application/json" \
  -d "{\"news_id\": \"$NEWS_ID\"}" \
  | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "news_id": "clxxx...",
  "content_generated": 4,
  "platforms": ["linkedin", "facebook", "instagram", "twitter"]
}
```

**Verify Execution:**
1. Apri N8N → Executions
2. Trova ultima esecuzione "UNSIC Content Factory v3"
3. Verifica:
   - [ ] Load News node: returns news object
   - [ ] Split Platforms: 4 items (linkedin, facebook, instagram, twitter)
   - [ ] Gemini Content: 4 successful calls
   - [ ] Nano-Banana: 4 images generated
   - [ ] Save Content: 4 DB inserts

**Verify DB:**
```bash
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT platform, LEFT(content_text, 50), status, content_image_url IS NOT NULL as has_image FROM unsic_content WHERE news_id='$NEWS_ID';"
```

- [ ] 4 records inserted
- [ ] All platforms covered
- [ ] Status: "ready"
- [ ] Images generated (has_image: true)

#### Test 2.2: Content Quality Check

**Verify LinkedIn content:**
```bash
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT content_text FROM unsic_content WHERE platform='linkedin' ORDER BY created_at DESC LIMIT 1;"
```

**Checklist:**
- [ ] Professional tone
- [ ] ~1300 characters
- [ ] Relevant hashtags (max 5)
- [ ] CTA present

**Verify Instagram content:**
```bash
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT content_text, array_length(hashtags, 1) as hashtag_count FROM unsic_content WHERE platform='instagram' ORDER BY created_at DESC LIMIT 1;"
```

- [ ] Visual storytelling style
- [ ] ~500 characters
- [ ] 20-30 hashtags
- [ ] Emoji usage

---

### Workflow 3: Social Publisher

#### Test 3.1: Manual Publish (Mock)

**Prerequisite:** At least 1 content with status "ready"

**Setup:**
```bash
# Set content as ready for publishing
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "UPDATE unsic_content SET status='ready', scheduled_for=NOW() - INTERVAL '1 hour' WHERE status='draft' LIMIT 1;"
```

**Trigger:**
```bash
curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-publish | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "total_published": 1,
  "platforms": ["linkedin"],
  "timestamp": "2025-12-03T10:00:00.000Z"
}
```

**Verify Execution:**
1. N8N → Executions → "UNSIC Social Publisher v3"
2. Verifica:
   - [ ] Get Scheduled Content: returns items
   - [ ] Filter Due: filters scheduled_for <= NOW
   - [ ] Platform Router (IF nodes): routes correctly
   - [ ] Mock Publish nodes: generate platform_post_id
   - [ ] Update Status: PATCH succeeds

**Verify DB:**
```bash
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT platform, status, platform_post_id, published_at FROM unsic_content WHERE status='published' ORDER BY published_at DESC LIMIT 5;"
```

- [ ] Status updated to "published"
- [ ] `platform_post_id` present (mock format: `linkedin_mock_...`)
- [ ] `published_at` timestamp set

#### Test 3.2: Schedule Trigger

**Steps:**
1. Attiva workflow (toggle switch)
2. Attendi 1 ora (or modify cron)

**Verify:**
```bash
# Check hourly executions
# (via N8N UI → Executions tab)

# Check published count
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT COUNT(*) FROM unsic_content WHERE status='published' AND published_at > NOW() - INTERVAL '24 hours';"
```

- [ ] Hourly executions running
- [ ] Content auto-published

#### Test 3.3: Telegram Notification (Optional)

**Prerequisite:** Telegram Bot configured

**Verify:**
1. Check Telegram chat
2. After publish trigger, should receive message like:

```
🚀 **UNSIC Social Publisher**
━━━━━━━━━━━━━━━
📊 Pubblicati: 4
🎯 Piattaforme: linkedin, facebook, instagram, twitter
⏰ 03/12/2025 10:30
```

- [ ] Telegram message received
- [ ] Correct stats
- [ ] Markdown formatting

---

## Integration Tests

### Test 4: End-to-End Flow

**Scenario:** News → Content → Publish (full pipeline)

**Steps:**

1. **Create mock news:**
   ```bash
   curl -X POST https://unsic.fodivps1.cloud/api/news \
     -H "Content-Type: application/json" \
     -d '{
       "category": "fisco",
       "pillar": "normativo",
       "rank": 1,
       "title": "Test E2E Flow",
       "summary": "End-to-end test for UNSIC pipeline",
       "why_relevant": "Testing complete workflow",
       "source": "Test",
       "link": "https://example.com"
     }' | jq -r '.news.id'
   ```

2. **Trigger Content Factory:**
   ```bash
   NEWS_ID="<id_from_step_1>"
   curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-content-factory \
     -H "Content-Type: application/json" \
     -d "{\"news_id\": \"$NEWS_ID\"}"
   ```

3. **Set content as ready:**
   ```bash
   docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
     -c "UPDATE unsic_content SET status='ready', scheduled_for=NOW() WHERE news_id='$NEWS_ID';"
   ```

4. **Trigger Publisher:**
   ```bash
   curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-publish
   ```

5. **Verify end state:**
   ```bash
   docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
     -c "SELECT n.title, c.platform, c.status, c.published_at FROM unsic_news n JOIN unsic_content c ON n.id = c.news_id WHERE n.id='$NEWS_ID';"
   ```

**Checklist:**
- [ ] News created successfully
- [ ] 4 content items generated
- [ ] All images present
- [ ] All published successfully
- [ ] Execution time < 5 minutes total

---

## Performance Tests

### Test 5: Bulk Processing

**Scenario:** Process 20 news items simultaneously

**Setup:**
```bash
# Create 20 test news
for i in {1..20}; do
  curl -X POST https://unsic.fodivps1.cloud/api/news \
    -H "Content-Type: application/json" \
    -d "{\"category\":\"fisco\",\"pillar\":\"normativo\",\"rank\":$i,\"title\":\"Bulk Test $i\",\"summary\":\"Test\",\"why_relevant\":\"Test\",\"source\":\"Test\",\"link\":\"https://example.com/$i\"}" &
done
wait
```

**Test:**
```bash
# Get all test news IDs
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -t \
  -c "SELECT id FROM unsic_news WHERE title LIKE 'Bulk Test%';" \
  | while read NEWS_ID; do
    curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-content-factory \
      -H "Content-Type: application/json" \
      -d "{\"news_id\": \"$NEWS_ID\"}" &
  done
wait
```

**Verify:**
```bash
docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \
  -c "SELECT COUNT(*) FROM unsic_content WHERE news_id IN (SELECT id FROM unsic_news WHERE title LIKE 'Bulk Test%');"
```

**Expected:**
- [ ] 80 content items created (20 news × 4 platforms)
- [ ] All executions successful (check N8N Executions)
- [ ] Processing time < 10 minutes total
- [ ] No rate limit errors

---

## Error Handling Tests

### Test 6: Invalid News ID

```bash
curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-content-factory \
  -H "Content-Type: application/json" \
  -d '{"news_id": "invalid_id_xxx"}' \
  | jq .
```

**Expected:**
- [ ] Workflow fails gracefully
- [ ] Error message returned
- [ ] No content created in DB

### Test 7: Gemini API Failure

**Simulate:** Temporarily set wrong API key in N8N env

```bash
# Set invalid key
docker exec vps-panel-n8n sh -c "export GOOGLE_GEMINI_API_KEY=invalid_key"

# Trigger workflow
# (should fail at Gemini node)
```

**Expected:**
- [ ] Execution marked as failed
- [ ] Clear error message in N8N
- [ ] No partial content saved

**Restore:**
```bash
# Set correct key back
cd /root/vps-panel
docker compose restart n8n
```

### Test 8: Nano-Banana Timeout

**Simulate:** Stop Nano-Banana service

```bash
cd /opt/services/nano-banana-service
docker compose stop
```

**Trigger:**
```bash
NEWS_ID=$(docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -t -c "SELECT id FROM unsic_news LIMIT 1;" | xargs)
curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-content-factory \
  -H "Content-Type: application/json" \
  -d "{\"news_id\": \"$NEWS_ID\"}"
```

**Expected:**
- [ ] Workflow fails at image generation
- [ ] Content created without images (content_image_url: null)

**Restore:**
```bash
cd /opt/services/nano-banana-service
docker compose up -d
```

---

## Final Checklist

### Production Readiness

- [ ] All 3 workflows imported and active
- [ ] Environment variables configured (`GOOGLE_GEMINI_API_KEY`)
- [ ] All API endpoints responding (200 status)
- [ ] Nano-Banana service running
- [ ] Database schema up-to-date (Prisma generated)
- [ ] PM2 app restarted with new API routes
- [ ] Manual tests passed (workflows 1-3)
- [ ] End-to-end flow successful
- [ ] Error handling tested
- [ ] Documentation reviewed

### Optional Enhancements

- [ ] Telegram bot configured for notifications
- [ ] Real social API credentials (LinkedIn, Facebook, Instagram, Twitter)
- [ ] Analytics workflow for engagement tracking
- [ ] Auto-retry logic for failed publishes
- [ ] Rate limiting for API calls
- [ ] Backup/restore procedures documented

---

## Test Results Log

| Test ID | Test Name | Status | Date | Notes |
|---------|-----------|--------|------|-------|
| 1.1 | News Intelligence Manual | ⏳ Pending | - | - |
| 1.2 | News Intelligence Schedule | ⏳ Pending | - | - |
| 2.1 | Content Factory Webhook | ⏳ Pending | - | - |
| 2.2 | Content Quality Check | ⏳ Pending | - | - |
| 3.1 | Publisher Manual | ⏳ Pending | - | - |
| 3.2 | Publisher Schedule | ⏳ Pending | - | - |
| 3.3 | Telegram Notification | ⏳ Skipped | - | Optional |
| 4 | End-to-End Flow | ⏳ Pending | - | - |
| 5 | Bulk Processing | ⏳ Pending | - | - |
| 6 | Invalid News ID | ⏳ Pending | - | - |
| 7 | Gemini API Failure | ⏳ Pending | - | - |
| 8 | Nano-Banana Timeout | ⏳ Pending | - | - |

**Legend:**
- ✅ Pass
- ❌ Fail
- ⏳ Pending
- ⏭️ Skipped

---

**Tester:** ___________________
**Date:** ___________________
**Sign-off:** ___________________

---

**Maintainer:** Claude Code (backend-senior-dev agent)
**VPS:** fodivps1.cloud
**Last Updated:** 2025-12-03
