-- CreateTable
CREATE TABLE "stylist_leaves" (
    "id" UUID NOT NULL,
    "stylist_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stylist_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stylist_leaves_stylist_id_idx" ON "stylist_leaves"("stylist_id");

-- CreateIndex
CREATE INDEX "stylist_leaves_start_date_end_date_idx" ON "stylist_leaves"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "stylist_leaves" ADD CONSTRAINT "stylist_leaves_stylist_id_fkey" FOREIGN KEY ("stylist_id") REFERENCES "stylists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
