-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "isSynced" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "isSynced" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Hour" ADD COLUMN     "isSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncGroupId" TEXT;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "isSynced" SET DEFAULT false;

-- AlterTable
ALTER TABLE "ItemOption" ALTER COLUMN "isSynced" SET DEFAULT false;

-- AlterTable
ALTER TABLE "LocationDay" ADD COLUMN     "isSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncGroupId" TEXT;

-- AlterTable
ALTER TABLE "Social" ALTER COLUMN "isSynced" SET DEFAULT false;
