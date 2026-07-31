import { prisma } from "@/lib/prisma";
import { hashBusinessApiKey } from "./generateBusinessApiKey";

export async function authenticateBusinessApiKey(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authorization.slice("Bearer ".length).trim();

  if (!apiKey) {
    return null;
  }

  const keyHash = hashBusinessApiKey(apiKey);

  const credential = await prisma.businessApiKey.findUnique({
    where: {
      keyHash,
    },
    select: {
      businessId: true,
      isActive: true,
    },
  });

  if (!credential?.isActive) {
    return null;
  }

  return {
    businessId: credential.businessId,
  };
}
