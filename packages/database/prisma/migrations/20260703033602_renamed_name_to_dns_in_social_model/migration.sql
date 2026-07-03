/*
  Warnings:

  - You are about to drop the column `name` on the `Social` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[businessId,dns,profileName]` on the table `Social` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dns` to the `Social` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Social_businessId_name_key";

-- AlterTable
ALTER TABLE "Social" DROP COLUMN "name",
ADD COLUMN     "dns" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Social_businessId_dns_profileName_key" ON "Social"("businessId", "dns", "profileName");
