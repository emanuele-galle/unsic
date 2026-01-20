-- AlterTable: Aggiungi campi AI Copy
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "copy_linkedin" TEXT;
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "copy_twitter" TEXT;
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "copy_instagram" TEXT;
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "copy_generated_at" TIMESTAMP(3);

-- AlterTable: Aggiungi campi Design Assets
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "bg_image_url" TEXT;
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "final_image_url" TEXT;
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "canva_design_id" TEXT;

-- AlterTable: Aggiungi campi Social Publishing
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "linkedin_post_id" TEXT;
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "twitter_post_id" TEXT;
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "instagram_post_id" TEXT;
ALTER TABLE "unsic_news" ADD COLUMN IF NOT EXISTS "publish_error" TEXT;

-- CreateTable: Activity Logs
CREATE TABLE IF NOT EXISTS "unsic_logs" (
    "id" TEXT NOT NULL,
    "news_id" TEXT,
    "workflow" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unsic_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Social Config
CREATE TABLE IF NOT EXISTS "social_config" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires" TIMESTAMP(3),
    "config_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "unsic_logs_news_id_idx" ON "unsic_logs"("news_id");
CREATE INDEX IF NOT EXISTS "unsic_logs_workflow_idx" ON "unsic_logs"("workflow");
CREATE INDEX IF NOT EXISTS "unsic_logs_level_idx" ON "unsic_logs"("level");
CREATE INDEX IF NOT EXISTS "unsic_logs_created_at_idx" ON "unsic_logs"("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "social_config_platform_key" ON "social_config"("platform");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'unsic_logs_news_id_fkey'
    ) THEN
        ALTER TABLE "unsic_logs" ADD CONSTRAINT "unsic_logs_news_id_fkey"
            FOREIGN KEY ("news_id") REFERENCES "unsic_news"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
