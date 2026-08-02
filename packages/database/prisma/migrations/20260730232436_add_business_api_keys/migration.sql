-- AlterEnum
ALTER TYPE "AccessLevel" ADD VALUE 'developer';

-- CreateTable
CREATE TABLE "BusinessApiKey" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessApiKey_keyHash_key" ON "BusinessApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "BusinessApiKey_businessId_idx" ON "BusinessApiKey"("businessId");

-- AddForeignKey
ALTER TABLE "BusinessApiKey" ADD CONSTRAINT "BusinessApiKey_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
