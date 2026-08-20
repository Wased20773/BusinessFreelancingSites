-- CreateEnum
CREATE TYPE "OnboardingIntent" AS ENUM ('staff', 'business', 'developer');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingIntent" "OnboardingIntent";
