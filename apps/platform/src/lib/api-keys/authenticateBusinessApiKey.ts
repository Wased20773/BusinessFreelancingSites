import { prisma } from "@/lib/prisma";
import { hashBusinessApiKey } from "./generateBusinessApiKey";
import { isOriginAllowed } from "./allowedOrigins";

export type BusinessApiKeyAuthenticationResult =
  | { businessId: string }
  | { blockedOrigin: string };

/*
 *   Resolves the Bearer API key on the request.
 *
 *   Returns:
 *       null                 -> missing, unknown, or inactive key
 *       { blockedOrigin }    -> valid key, but called from a browser origin that
 *                               is not in the key's allowedOrigins
 *       { businessId }       -> authenticated
 *
 *   Requests without an Origin header (server-to-server) are not restricted.
 **/
export async function authenticateBusinessApiKey(
  request: Request,
): Promise<BusinessApiKeyAuthenticationResult | null> {
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
      allowedOrigins: true,
    },
  });

  if (!credential?.isActive) {
    return null;
  }

  const origin = request.headers.get("origin");

  if (origin !== null && !isOriginAllowed(origin, credential.allowedOrigins)) {
    return {
      blockedOrigin: origin,
    };
  }

  return {
    businessId: credential.businessId,
  };
}
