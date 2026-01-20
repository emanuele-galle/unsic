#!/bin/bash

###############################################################################
# UNSIC N8N Workflows v3 - Quick Start Script
# Created: 2025-12-03
# Purpose: Automated setup and testing for UNSIC N8N workflows
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ] && [ -z "$SUDO_USER" ]; then
  print_warning "This script should be run with sudo for Docker commands"
  print_info "Usage: sudo bash QUICK-START.sh"
fi

###############################################################################
# Step 1: Pre-flight Checks
###############################################################################

print_header "Step 1: Pre-flight Checks"

# Check database
print_info "Checking PostgreSQL database..."
if docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -c "SELECT 1;" >/dev/null 2>&1; then
  print_success "PostgreSQL database is running"
else
  print_error "PostgreSQL database is not accessible"
  exit 1
fi

# Check API endpoints
print_info "Checking UNSIC API endpoints..."
if curl -s https://unsic.fodivps1.cloud/api/news | jq -e '.success' >/dev/null 2>&1; then
  print_success "API /api/news is responding"
else
  print_error "API /api/news is not responding"
  exit 1
fi

if curl -s https://unsic.fodivps1.cloud/api/content | jq -e '.success' >/dev/null 2>&1; then
  print_success "API /api/content is responding"
else
  print_error "API /api/content is not responding"
  exit 1
fi

# Check Nano-Banana
print_info "Checking Nano-Banana service..."
if curl -s http://172.19.0.1:8100/health | jq -e '.status == "healthy"' >/dev/null 2>&1; then
  print_success "Nano-Banana service is healthy"
else
  print_warning "Nano-Banana service is not responding (image generation will fail)"
  print_info "To fix: cd /opt/services/nano-banana-service && docker compose up -d"
fi

# Check N8N
print_info "Checking N8N service..."
if docker ps | grep -q "vps-panel-n8n"; then
  print_success "N8N container is running"
else
  print_error "N8N container is not running"
  exit 1
fi

# Check Gemini API key
print_info "Checking Google Gemini API key..."
if docker exec vps-panel-n8n env | grep -q "GOOGLE_GEMINI_API_KEY"; then
  print_success "GOOGLE_GEMINI_API_KEY is set"
else
  print_warning "GOOGLE_GEMINI_API_KEY is not set in N8N environment"
  print_info "To fix: echo 'GOOGLE_GEMINI_API_KEY=your_key' >> /root/vps-panel/.env && cd /root/vps-panel && docker compose restart n8n"
fi

###############################################################################
# Step 2: Database Stats
###############################################################################

print_header "Step 2: Database Current State"

print_info "Counting existing records..."

NEWS_COUNT=$(docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -t -c "SELECT COUNT(*) FROM unsic_news;" | xargs)
CONTENT_COUNT=$(docker exec -i unsic-postgres psql -U unsic_user -d unsic_db -t -c "SELECT COUNT(*) FROM unsic_content;" | xargs)

echo -e "  News records: ${GREEN}$NEWS_COUNT${NC}"
echo -e "  Content records: ${GREEN}$CONTENT_COUNT${NC}"

if [ "$NEWS_COUNT" -eq 0 ]; then
  print_warning "No news in database. News Intelligence workflow will populate this."
fi

if [ "$CONTENT_COUNT" -eq 0 ]; then
  print_info "No content yet. Content Factory will generate after news approval."
fi

###############################################################################
# Step 3: Test API Endpoints
###############################################################################

print_header "Step 3: Testing API Endpoints"

# Test POST /api/news (create test news)
print_info "Creating test news item..."
TEST_NEWS_RESPONSE=$(curl -s -X POST https://unsic.fodivps1.cloud/api/news \
  -H "Content-Type: application/json" \
  -d '{
    "category": "fisco",
    "pillar": "normativo",
    "rank": 99,
    "title": "Test News (Quick Start Script)",
    "summary": "Automated test from quick start script",
    "why_relevant": "Testing UNSIC N8N workflows integration",
    "source": "Quick Start Script",
    "link": "https://fodivps1.cloud/test"
  }')

if echo "$TEST_NEWS_RESPONSE" | jq -e '.success' >/dev/null 2>&1; then
  TEST_NEWS_ID=$(echo "$TEST_NEWS_RESPONSE" | jq -r '.news.id')
  print_success "Test news created with ID: $TEST_NEWS_ID"
else
  print_error "Failed to create test news"
  echo "$TEST_NEWS_RESPONSE"
  exit 1
fi

# Test GET /api/news/:id
print_info "Retrieving test news by ID..."
if curl -s "https://unsic.fodivps1.cloud/api/news/$TEST_NEWS_ID" | jq -e '.id' >/dev/null 2>&1; then
  print_success "Successfully retrieved news by ID"
else
  print_error "Failed to retrieve news by ID"
fi

###############################################################################
# Step 4: N8N Workflow URLs
###############################################################################

print_header "Step 4: N8N Workflow Information"

print_info "Workflow files location:"
echo -e "  ${BLUE}/var/www/projects/unsic/n8n-workflows/v3/${NC}"
ls -lh /var/www/projects/unsic/n8n-workflows/v3/*.json

print_info "\nN8N Webhook URLs (after import):"
echo -e "  Content Factory: ${GREEN}https://n8n.fodivps1.cloud/webhook/unsic-content-factory${NC}"
echo -e "  Social Publisher: ${GREEN}https://n8n.fodivps1.cloud/webhook/unsic-publish${NC}"

print_info "\nN8N Dashboard:"
echo -e "  ${GREEN}https://n8n.fodivps1.cloud${NC}"

###############################################################################
# Step 5: Manual Import Instructions
###############################################################################

print_header "Step 5: Import Workflows to N8N"

print_info "Follow these steps to import workflows:"
echo -e "
${YELLOW}1. Open N8N Dashboard:${NC}
   https://n8n.fodivps1.cloud

${YELLOW}2. Import each workflow:${NC}
   - Click 'Workflows' → 'Import from File'
   - Upload: ${BLUE}UNSIC_News_Intelligence.json${NC}
   - Rename to: 'UNSIC News Intelligence v3'
   - Click 'Save' → 'Activate'

   - Repeat for: ${BLUE}UNSIC_Content_Factory.json${NC}
   - Rename to: 'UNSIC Content Factory v3'
   - Click 'Save' → 'Activate'

   - Repeat for: ${BLUE}UNSIC_Social_Publisher.json${NC}
   - Rename to: 'UNSIC Social Publisher v3'
   - Click 'Save' → 'Activate'

${YELLOW}3. Verify nodes:${NC}
   - Open each workflow
   - Check that all nodes are green (no errors)
   - Verify environment variables are loaded

${YELLOW}4. Test workflows:${NC}
   - News Intelligence: Click 'Execute Workflow' (manual trigger)
   - Content Factory: Use webhook (see test commands below)
   - Social Publisher: Use webhook (see test commands below)
"

###############################################################################
# Step 6: Test Commands (Copy-Paste Ready)
###############################################################################

print_header "Step 6: Test Commands (After Import)"

print_info "Test Content Factory webhook:"
echo -e "${GREEN}curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-content-factory \\
  -H \"Content-Type: application/json\" \\
  -d '{\"news_id\": \"$TEST_NEWS_ID\"}'${NC}"

print_info "\nTest Social Publisher webhook:"
echo -e "${GREEN}curl -X POST https://n8n.fodivps1.cloud/webhook/unsic-publish${NC}"

print_info "\nVerify results in database:"
echo -e "${GREEN}docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \\
  -c \"SELECT COUNT(*), status FROM unsic_news GROUP BY status;\"

docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \\
  -c \"SELECT COUNT(*), platform, status FROM unsic_content GROUP BY platform, status;\"${NC}"

###############################################################################
# Step 7: Cleanup Test Data (Optional)
###############################################################################

print_header "Step 7: Cleanup (Optional)"

print_info "To remove test news created by this script:"
echo -e "${YELLOW}docker exec -i unsic-postgres psql -U unsic_user -d unsic_db \\
  -c \"DELETE FROM unsic_news WHERE title LIKE '%Quick Start Script%';\"${NC}"

###############################################################################
# Summary
###############################################################################

print_header "Summary"

print_success "Pre-flight checks completed successfully!"
print_success "Test news created with ID: $TEST_NEWS_ID"
print_info "Next steps:"
echo -e "
  1. Import workflows to N8N (see Step 5 above)
  2. Test workflows using commands in Step 6
  3. Check documentation:
     - README.md (technical details)
     - IMPORT-GUIDE.md (full import instructions)
     - TEST-CHECKLIST.md (comprehensive tests)
     - SUMMARY.md (delivery overview)
"

print_info "For troubleshooting, see: ${BLUE}IMPORT-GUIDE.md § Troubleshooting${NC}"

print_success "\n✨ UNSIC N8N Workflows v3 is ready for import!"

###############################################################################
# End
###############################################################################
