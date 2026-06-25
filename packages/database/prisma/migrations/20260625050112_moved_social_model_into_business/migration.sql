/*
  Warnings:

  - You are about to drop the column `contactId` on the `Social` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[businessId,name]` on the table `Social` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `businessId` to the `Social` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Social" DROP CONSTRAINT "Social_contactId_fkey";

-- AlterTable
ALTER TABLE "Social" DROP COLUMN "contactId",
ADD COLUMN     "businessId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Social_businessId_name_key" ON "Social"("businessId", "name");

-- AddForeignKey
ALTER TABLE "Social" ADD CONSTRAINT "Social_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
