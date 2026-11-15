-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "addOnsVaryByOption" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AddOnGroup" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "syncGroupId" TEXT,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "calories" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "syncGroupId" TEXT,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAddOn" (
    "itemId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "order" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemAddOn_pkey" PRIMARY KEY ("itemId","addOnId")
);

-- CreateTable
CREATE TABLE "ItemOptionAddOn" (
    "optionId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "order" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemOptionAddOn_pkey" PRIMARY KEY ("optionId","addOnId")
);

-- CreateIndex
CREATE INDEX "AddOnGroup_locationId_idx" ON "AddOnGroup"("locationId");

-- CreateIndex
CREATE INDEX "AddOnGroup_syncGroupId_idx" ON "AddOnGroup"("syncGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "AddOnGroup_locationId_name_key" ON "AddOnGroup"("locationId", "name");

-- CreateIndex
CREATE INDEX "AddOn_locationId_idx" ON "AddOn"("locationId");

-- CreateIndex
CREATE INDEX "AddOn_groupId_idx" ON "AddOn"("groupId");

-- CreateIndex
CREATE INDEX "AddOn_syncGroupId_idx" ON "AddOn"("syncGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_groupId_name_key" ON "AddOn"("groupId", "name");

-- CreateIndex
CREATE INDEX "ItemAddOn_addOnId_idx" ON "ItemAddOn"("addOnId");

-- CreateIndex
CREATE INDEX "ItemOptionAddOn_addOnId_idx" ON "ItemOptionAddOn"("addOnId");

-- AddForeignKey
ALTER TABLE "AddOnGroup" ADD CONSTRAINT "AddOnGroup_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AddOnGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAddOn" ADD CONSTRAINT "ItemAddOn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAddOn" ADD CONSTRAINT "ItemAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOptionAddOn" ADD CONSTRAINT "ItemOptionAddOn_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ItemOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOptionAddOn" ADD CONSTRAINT "ItemOptionAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
