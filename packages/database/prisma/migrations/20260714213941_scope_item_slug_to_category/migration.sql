/*
  Warnings:

  - A unique constraint covering the columns `[categoryId,slug]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Item_businessId_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Item_categoryId_slug_key" ON "Item"("categoryId", "slug");
