-- AlterTable
ALTER TABLE "unsic_news" ADD CONSTRAINT "unsic_news_link_key" UNIQUE ("link");

-- CreateIndex
CREATE INDEX "unsic_news_link_idx" ON "unsic_news"("link");
