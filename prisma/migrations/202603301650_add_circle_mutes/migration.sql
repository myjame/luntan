-- CreateTable
CREATE TABLE "circle_mutes" (
    "id" TEXT NOT NULL,
    "circle_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "revoked_by_id" TEXT,
    "reason" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circle_mutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "circle_mutes_circle_id_user_id_key" ON "circle_mutes"("circle_id", "user_id");

-- CreateIndex
CREATE INDEX "circle_mutes_user_id_idx" ON "circle_mutes"("user_id");

-- CreateIndex
CREATE INDEX "circle_mutes_circle_id_revoked_at_expires_at_idx" ON "circle_mutes"("circle_id", "revoked_at", "expires_at");

-- AddForeignKey
ALTER TABLE "circle_mutes" ADD CONSTRAINT "circle_mutes_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_mutes" ADD CONSTRAINT "circle_mutes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_mutes" ADD CONSTRAINT "circle_mutes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_mutes" ADD CONSTRAINT "circle_mutes_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
