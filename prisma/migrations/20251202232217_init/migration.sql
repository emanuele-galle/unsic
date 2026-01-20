-- CreateTable
CREATE TABLE "unsic_news" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "why_relevant" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unsic_news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unsic_news_status_idx" ON "unsic_news"("status");

-- CreateIndex
CREATE INDEX "unsic_news_created_at_idx" ON "unsic_news"("created_at");
