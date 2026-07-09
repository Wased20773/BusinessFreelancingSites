/*
  Warnings:

  - You are about to drop the `LocationHour` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LocationHour" DROP CONSTRAINT "LocationHour_locationId_fkey";

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "order" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "order" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "ItemOption" ALTER COLUMN "order" SET DEFAULT 1;

-- DropTable
DROP TABLE "LocationHour";

-- CreateTable
CREATE TABLE "LocationDay" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LocationDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hour" (
    "id" TEXT NOT NULL,
    "locationDayId" TEXT NOT NULL,
    "title" TEXT,
    "note" TEXT,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Hour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationDay_locationId_dayOfWeek_key" ON "LocationDay"("locationId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Hour_locationDayId_openTime_closeTime_key" ON "Hour"("locationDayId", "openTime", "closeTime");

-- AddForeignKey
ALTER TABLE "LocationDay" ADD CONSTRAINT "LocationDay_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hour" ADD CONSTRAINT "Hour_locationDayId_fkey" FOREIGN KEY ("locationDayId") REFERENCES "LocationDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
