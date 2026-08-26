/*
  Warnings:

  - You are about to drop the column `allowLocationOverrides` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `allowLocationOverrides` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `allowLocationOverrides` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `allowLocationOverrides` on the `ItemOption` table. All the data in the column will be lost.
  - You are about to drop the column `allowLocationOverrides` on the `Social` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Category"
RENAME COLUMN "allowLocationOverrides" TO "isSynced";

-- AlterTable
ALTER TABLE "Contact"
RENAME COLUMN "allowLocationOverrides" TO "isSynced";

-- AlterTable
ALTER TABLE "Item"
RENAME COLUMN "allowLocationOverrides" TO "isSynced";

-- AlterTable
ALTER TABLE "ItemOption"
RENAME COLUMN "allowLocationOverrides" TO "isSynced";

-- AlterTable
ALTER TABLE "Social"
RENAME COLUMN "allowLocationOverrides" TO "isSynced";