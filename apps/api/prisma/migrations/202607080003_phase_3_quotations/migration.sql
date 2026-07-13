CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

CREATE TABLE "quotations" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "quotation_number" TEXT NOT NULL,
  "status" "QuotationStatus" NOT NULL DEFAULT 'draft',
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "valid_until" TIMESTAMP(3),
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");
CREATE INDEX "quotations_lead_id_idx" ON "quotations"("lead_id");
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

ALTER TABLE "quotations"
ADD CONSTRAINT "quotations_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "leads"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quotations"
ADD CONSTRAINT "quotations_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "quotation_items" (
  "id" TEXT NOT NULL,
  "quotation_id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items"("quotation_id");

ALTER TABLE "quotation_items"
ADD CONSTRAINT "quotation_items_quotation_id_fkey"
FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
