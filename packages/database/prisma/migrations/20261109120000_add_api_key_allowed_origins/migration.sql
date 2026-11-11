-- AlterTable
ALTER TABLE "BusinessApiKey" ADD COLUMN     "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[];
