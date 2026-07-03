/*
  Warnings:

  - You are about to drop the column `expires_at` on the `Session` table. All the data in the column will be lost.
  - Added the required column `expires` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "access_token" TEXT;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "expires_at",
ADD COLUMN     "expires" TIMESTAMP(3) NOT NULL;
