/*
  Warnings:

  - A unique constraint covering the columns `[businessId,parentId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Category_businessId_name_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Category_businessId_parentId_idx" ON "Category"("businessId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_businessId_parentId_name_key" ON "Category"("businessId", "parentId", "name");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
