/*
  Warnings:

  - You are about to drop the column `businessId` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `businessId` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `businessId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `businessId` on the `Social` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Social" DROP CONSTRAINT "Social_businessId_fkey";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "businessId";

-- AlterTable
ALTER TABLE "Social" DROP COLUMN "businessId";
