/*
  Warnings:

  - A unique constraint covering the columns `[locationId,parentId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[locationId,slug]` on the table `Item` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[locationId,domain,profileName]` on the table `Social` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Social" DROP CONSTRAINT "Social_businessId_fkey";

-- DropIndex
DROP INDEX "Category_businessId_parentId_idx";

-- DropIndex
DROP INDEX "Category_businessId_parentId_name_key";

-- DropIndex
DROP INDEX "Item_categoryId_slug_key";

-- DropIndex
DROP INDEX "Social_businessId_domain_profileName_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "allowLocationOverrides" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "syncGroupId" TEXT,
ALTER COLUMN "businessId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "allowLocationOverrides" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "syncGroupId" TEXT,
ALTER COLUMN "businessId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "allowLocationOverrides" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "syncGroupId" TEXT,
ALTER COLUMN "businessId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ItemOption" ADD COLUMN     "allowLocationOverrides" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "syncGroupId" TEXT;

-- AlterTable
ALTER TABLE "Social" ADD COLUMN     "allowLocationOverrides" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "syncGroupId" TEXT,
ALTER COLUMN "businessId" DROP NOT NULL;

-- MigrateData
UPDATE "Category"
SET "locationId" = (
    SELECT "Location"."id"
    FROM "Location"
    WHERE "Location"."businessId" = "Category"."businessId"
    ORDER BY "Location"."createdAt" ASC
    LIMIT 1
);

-- MigrateData
UPDATE "Contact"
SET "locationId" = (
    SELECT "Location"."id"
    FROM "Location"
    WHERE "Location"."businessId" = "Contact"."businessId"
    ORDER BY "Location"."createdAt" ASC
    LIMIT 1
);

-- MigrateData
UPDATE "Social"
SET "locationId" = (
    SELECT "Location"."id"
    FROM "Location"
    WHERE "Location"."businessId" = "Social"."businessId"
    ORDER BY "Location"."createdAt" ASC
    LIMIT 1
);

-- MigrateData
UPDATE "Item"
SET "locationId" = (
    SELECT "Category"."locationId"
    FROM "Category"
    WHERE "Category"."id" = "Item"."categoryId"
);

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "locationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "locationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "locationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Social" ALTER COLUMN "locationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Category_locationId_parentId_idx" ON "Category"("locationId", "parentId");

-- CreateIndex
CREATE INDEX "Category_syncGroupId_idx" ON "Category"("syncGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_locationId_parentId_name_key" ON "Category"("locationId", "parentId", "name");

-- CreateIndex
CREATE INDEX "Contact_locationId_idx" ON "Contact"("locationId");

-- CreateIndex
CREATE INDEX "Contact_syncGroupId_idx" ON "Contact"("syncGroupId");

-- CreateIndex
CREATE INDEX "Hour_specialDayId_idx" ON "Hour"("specialDayId");

-- CreateIndex
CREATE INDEX "Item_locationId_idx" ON "Item"("locationId");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE INDEX "Item_syncGroupId_idx" ON "Item"("syncGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_locationId_slug_key" ON "Item"("locationId", "slug");

-- CreateIndex
CREATE INDEX "ItemOption_itemId_idx" ON "ItemOption"("itemId");

-- CreateIndex
CREATE INDEX "ItemOption_syncGroupId_idx" ON "ItemOption"("syncGroupId");

-- CreateIndex
CREATE INDEX "Location_businessId_idx" ON "Location"("businessId");

-- CreateIndex
CREATE INDEX "LocationDay_locationId_idx" ON "LocationDay"("locationId");

-- CreateIndex
CREATE INDEX "Social_locationId_idx" ON "Social"("locationId");

-- CreateIndex
CREATE INDEX "Social_syncGroupId_idx" ON "Social"("syncGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Social_locationId_domain_profileName_key" ON "Social"("locationId", "domain", "profileName");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Social" ADD CONSTRAINT "Social_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Social" ADD CONSTRAINT "Social_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;