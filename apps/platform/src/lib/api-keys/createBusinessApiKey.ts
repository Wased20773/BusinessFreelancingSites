import { prisma } from "@/lib/prisma";
import { generateBusinessApiKey } from "./generateBusinessApiKey";

type CreateBusinessApiKeyInput = {
  businessId: string;
  name: string;
};

export async function createBusinessApiKey({
  businessId,
  name,
}: CreateBusinessApiKeyInput) {
  const { apiKey, keyHash, keyPrefix } = generateBusinessApiKey();

  const createdKey = await prisma.businessApiKey.create({
    data: {
      businessId,
      name,
      keyHash,
      keyPrefix,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      createdAt: true,
    },
  });

  return {
    apiKey,
    credential: createdKey,
  };
}
