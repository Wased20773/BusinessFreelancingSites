-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dashboardTourVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workspaceTourVersion" INTEGER NOT NULL DEFAULT 0;
