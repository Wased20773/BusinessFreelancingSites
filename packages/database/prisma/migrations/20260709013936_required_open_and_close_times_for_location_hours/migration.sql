/*
  Warnings:

  - Made the column `openTime` on table `Hour` required. This step will fail if there are existing NULL values in that column.
  - Made the column `closeTime` on table `Hour` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Hour" ALTER COLUMN "openTime" SET NOT NULL,
ALTER COLUMN "closeTime" SET NOT NULL;
