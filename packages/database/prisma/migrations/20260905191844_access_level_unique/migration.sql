/*
  Warnings:

  - A unique constraint covering the columns `[accessLevel]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Role_accessLevel_key" ON "Role"("accessLevel");
