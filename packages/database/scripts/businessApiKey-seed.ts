import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

const API_KEY_PREFIX = "bp_";

function hashBusinessApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function generateBusinessApiKey() {
  const secret = randomBytes(32).toString("hex");
  const apiKey = `${API_KEY_PREFIX}${secret}`;

  return {
    apiKey,
    keyHash: hashBusinessApiKey(apiKey),
    keyPrefix: apiKey.slice(0, 10),
  };
}

async function main() {
  const businessSlug = process.argv[2] ?? "example-resturant";
  const keyName = process.argv[3] ?? "Development Website";

  const business = await prisma.business.findUnique({
    where: {
      slug: businessSlug,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!business) {
    throw new Error(`[x] No business found with slug "${businessSlug}".`);
  }

  const { apiKey, keyHash, keyPrefix } = generateBusinessApiKey();

  await prisma.businessApiKey.create({
    data: {
      businessId: business.id,
      name: keyName,
      keyHash,
      keyPrefix,
    },
  });

  console.log(`\n[+] API key created for ${business.name}`);
  console.log(`[+] Key name: ${keyName}`);
  console.log(`[+] Prefix: ${keyPrefix}`);

  console.log("\nCopy this key now. It will not be retrievable later:\n");

  console.log(apiKey);
}

main()
  .catch((error) => {
    console.error("\nFailed to create business API key:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
