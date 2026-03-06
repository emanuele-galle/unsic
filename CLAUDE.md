# UNSIC News Platform

## Quick Info

| | |
|---|---|
| **URL** | https://unsic.muscarivps.cloud |
| **PM2** | unsic-dashboard (port 3025) |
| **Database** | PostgreSQL:5439 |
| **Created** | 2025-12-02 |

## Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 + TypeScript + Tailwind |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL 16 (Docker) |
| **ORM** | Prisma 5.22 |
| **Animations** | Framer Motion |
| **Tier** | Standard |

## Project Structure

```
/var/www/projects/unsic/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── dashboard/news/page.tsx    # Dashboard notizie
│   │   └── api/
│   │       └── news/
│   │           ├── route.ts            # GET/POST news
│   │           └── [id]/
│   │               ├── route.ts        # DELETE news
│   │               └── approve/route.ts # POST approve
│   ├── components/ui/                  # UI components
│   └── lib/
│       ├── prisma.ts                   # Prisma client
│       └── utils.ts                    # Utilities
├── prisma/
│   ├── schema.prisma                   # Database schema
│   └── migrations/                     # DB migrations
├── docker-compose.yml                  # PostgreSQL container
├── ecosystem.config.js                 # PM2 configuration
└── .env                                # Environment variables
```

## Database Schema

```prisma
model UnsicNews {
  id            String   @id @default(cuid())
  category      String
  pillar        String
  rank          Int
  title         String
  summary       String   @db.Text
  why_relevant  String   @db.Text
  source        String
  link          String
  published_at  DateTime
  status        String   @default("pending")
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@index([status])
  @@index([created_at])
  @@map("unsic_news")
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/news` | GET | Get all news (query: ?status=pending) |
| `/api/news` | POST | Create news (called by N8N) |
| `/api/news/:id/approve` | POST | Approve news + trigger N8N webhook |
| `/api/news/:id` | DELETE | Reject news (status=rejected) |

## Dashboard Features

- **Stats Cards:** Notizie oggi, in attesa, pubblicate
- **News List:** Grid con filtri categoria/pillar
- **Actions:** Approva (→ N8N) o Scarta
- **Auto-refresh:** Ogni 30 secondi
- **Glassmorphism UI:** Dark theme con gradient

## N8N Integration

### Incoming Webhook (N8N → UNSIC)
- **Endpoint:** `POST /api/news`
- **Payload:**
  ```json
  {
    "category": "fisco",
    "pillar": "istituzionale",
    "rank": 1,
    "title": "...",
    "summary": "...",
    "why_relevant": "...",
    "source": "Agenzia Entrate",
    "link": "https://...",
    "published_at": "2025-12-02T10:00:00Z"
  }
  ```

### Outgoing Webhook (UNSIC → N8N)
- **URL:** `https://n8n.muscarivps.cloud/webhook/unsic-approve`
- **Trigger:** When news approved via dashboard
- **Payload:** Full news object with status="approved"

## Prisma Commands

```bash
cd /var/www/projects/unsic

# Generate Client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Deploy migrations (production)
npx prisma migrate deploy

# Prisma Studio (GUI)
npx prisma studio  # http://localhost:5555
```

## PM2 Commands

```bash
# Logs
pm2 logs unsic-dashboard

# Restart
pm2 restart unsic-dashboard

# Stop
pm2 stop unsic-dashboard

# Status
pm2 status | grep unsic
```

## Deploy Workflow

```bash
cd /var/www/projects/unsic

# Pull latest code (if git repo)
git pull

# Install dependencies
npm install

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# Restart PM2
pm2 restart unsic-dashboard
```

## Environment Variables

```bash
# Location: /var/www/projects/unsic/.env (chmod 600)

DATABASE_URL="postgresql://unsic_user:***@localhost:5439/unsic_db"
NODE_ENV=production
PORT=3025
NEXT_PUBLIC_API_URL=https://unsic.muscarivps.cloud
N8N_WEBHOOK_URL=https://n8n.muscarivps.cloud/webhook/unsic-approve
```

## Database Credentials

| Parameter | Value |
|-----------|-------|
| **Host** | localhost |
| **Port** | 5439 |
| **Database** | unsic_db |
| **User** | unsic_user |
| **Password** | `fqu0qhNOMdULpoHZETXAvALzhiQ2aAcI` |
| **Container** | unsic-postgres |

## Docker Commands

```bash
cd /var/www/projects/unsic

# Start database
docker compose up -d

# Stop database
docker compose down

# Logs
docker logs unsic-postgres -f

# Backup database
docker exec unsic-postgres pg_dump -U unsic_user unsic_db > backup-$(date +%Y%m%d).sql

# Restore database
cat backup.sql | docker exec -i unsic-postgres psql -U unsic_user unsic_db
```

## Connect to Database

```bash
# Via Docker
docker exec -it unsic-postgres psql -U unsic_user -d unsic_db

# Via local psql
psql postgresql://unsic_user:fqu0qhNOMdULpoHZETXAvALzhiQ2aAcI@localhost:5439/unsic_db

# Queries
SELECT * FROM unsic_news WHERE status = 'pending';
SELECT COUNT(*) FROM unsic_news GROUP BY status;
```

## Traefik Routing

```yaml
# File: /root/vps-panel/traefik/dynamic/unsic.yml

http:
  routers:
    unsic:
      rule: "Host(`unsic.muscarivps.cloud`)"
      service: unsic
      entryPoints:
        - websecure
      tls:
        certResolver: le  # Let's Encrypt auto SSL

  services:
    unsic:
      loadBalancer:
        servers:
          - url: "http://localhost:3025"
```

## Development

```bash
cd /var/www/projects/unsic

# Install dependencies
npm install

# Start dev server
npm run dev  # http://localhost:3000

# Type checking
npm run type-check

# Build
npm run build

# Start production
npm start
```

## Future Development

1. **Landing Page:** Sostituire placeholder con landing completa
2. **Analytics:** Dashboard stats avanzate (categorie, trends)
3. **Filters:** Filtro per categoria/pillar/data
4. **Export:** Esporta notizie in CSV/PDF
5. **Multi-user:** Sistema autenticazione per più utenti
6. **Notifications:** Push notifications per nuove notizie
7. **Archive:** Sistema archiviazione notizie vecchie

## Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| **App non raggiungibile** | `pm2 restart unsic-dashboard`, check logs |
| **DB connection error** | `docker ps`, verify port 5439, check .env |
| **Build fallisce** | `npm run type-check`, `npx prisma generate` |
| **API 500 error** | Check `pm2 logs unsic-dashboard`, verify DB connection |
| **N8N webhook fails** | Verify N8N_WEBHOOK_URL in .env |

## Ports Allocated

| Service | Port | Status |
|---------|------|--------|
| **Next.js App** | 3025 | PM2 managed |
| **PostgreSQL** | 5439 | Docker container |

## Links

- **Dashboard:** https://unsic.muscarivps.cloud/dashboard/news
- **API Docs:** https://unsic.muscarivps.cloud/api/news
- **N8N Workflow:** https://n8n.muscarivps.cloud

---

**Last Updated:** 2025-12-02
**Status:** ✅ Production Ready
