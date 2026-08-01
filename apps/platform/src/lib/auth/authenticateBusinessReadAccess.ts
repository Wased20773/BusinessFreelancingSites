import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { authenticateBusinessApiKey } from "@/lib/api-keys/authenticateBusinessApiKey";

type BusinessReadAuthentication = {
  businessId: string;
  authenticationType: "session" | "apiKey";
  userId?: string;
};

export async function authenticateBusinessReadAccess(
  request: Request,
  allowedRoles: AccessLevel[],
): Promise<NextResponse | BusinessReadAuthentication> {
  const authorizationHeader = request.headers.get("authorization");

  // An Authorization header means this request is explicitly using an API key.
  if (authorizationHeader) {
    const apiKeyAuthentication = await authenticateBusinessApiKey(request);

    if (!apiKeyAuthentication) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return {
      businessId: apiKeyAuthentication.businessId,
      authenticationType: "apiKey",
    };
  }

  // Without an API-key header, treat it as a dashboard request.
  const sessionAuthentication = await authenticateBusinessAccess(
    request,
    allowedRoles,
  );

  if (sessionAuthentication instanceof NextResponse) {
    return sessionAuthentication;
  }

  return {
    userId: sessionAuthentication.userId,
    businessId: sessionAuthentication.businessId,
    authenticationType: "session",
  };
}
