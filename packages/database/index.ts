// Re-export the generated Prisma Client and Prisma enums from this package.
//
// The Prisma Client is generated into `packages/database/generated/prisma`.
// This file gives the rest of the monorepo a clean import data, so apps can
// import from:
//
//   @business-freelancer/database
//
// instead of importing directly from the generated Prisma folder

export { PrismaClient } from "./generated/prisma/client";
export { AccessLevel, DayOfWeek } from "./generated/prisma/enums";