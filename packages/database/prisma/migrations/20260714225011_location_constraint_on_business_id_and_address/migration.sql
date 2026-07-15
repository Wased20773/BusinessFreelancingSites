/*
  Warnings:

  - A unique constraint covering the columns `[businessId,address]` on the table `Location` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Location_businessId_address_key" ON "Location"("businessId", "address");
