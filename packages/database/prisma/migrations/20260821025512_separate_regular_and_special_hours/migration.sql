/*
  Warnings:

  - You are about to drop the column `locationDayId` on the `Hour` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[regularDayId]` on the table `Hour` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[specialDayId,openTime,closeTime]` on the table `Hour` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Hour" DROP CONSTRAINT "Hour_locationDayId_fkey";

-- DropIndex
DROP INDEX "Hour_locationDayId_openTime_closeTime_key";

-- AlterTable
ALTER TABLE "Hour" DROP COLUMN "locationDayId",
ADD COLUMN     "regularDayId" TEXT,
ADD COLUMN     "specialDayId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Hour_regularDayId_key" ON "Hour"("regularDayId");

-- CreateIndex
CREATE UNIQUE INDEX "Hour_specialDayId_openTime_closeTime_key" ON "Hour"("specialDayId", "openTime", "closeTime");

-- AddForeignKey
ALTER TABLE "Hour" ADD CONSTRAINT "Hour_regularDayId_fkey" FOREIGN KEY ("regularDayId") REFERENCES "LocationDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hour" ADD CONSTRAINT "Hour_specialDayId_fkey" FOREIGN KEY ("specialDayId") REFERENCES "LocationDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
