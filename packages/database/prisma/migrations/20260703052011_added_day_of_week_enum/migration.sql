/*
  Warnings:

  - Changed the type of `dayOfWeek` on the `LocationHour` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- AlterTable
ALTER TABLE "LocationHour"
ALTER COLUMN "dayOfWeek" TYPE "DayOfWeek"
USING "dayOfWeek"::"DayOfWeek";