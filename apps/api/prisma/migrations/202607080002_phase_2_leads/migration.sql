CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'site_visit', 'quoted', 'won', 'lost');
CREATE TYPE "LeadSource" AS ENUM ('walk_in', 'referral', 'website', 'phone', 'social', 'other');

CREATE TABLE "leads" (
  "id" TEXT NOT NULL,
  "client_name" TEXT NOT NULL,
  "contact_phone" TEXT NOT NULL,
  "contact_email" TEXT,
  "source" "LeadSource" NOT NULL,
  "status" "LeadStatus" NOT NULL DEFAULT 'new',
  "estimated_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "assigned_to" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_source_idx" ON "leads"("source");
CREATE INDEX "leads_assigned_to_idx" ON "leads"("assigned_to");

ALTER TABLE "leads"
ADD CONSTRAINT "leads_assigned_to_fkey"
FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "activity_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "metadata_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

ALTER TABLE "activity_logs"
ADD CONSTRAINT "activity_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
