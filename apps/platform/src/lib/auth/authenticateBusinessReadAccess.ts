import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";

import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { authenticateBusinessApiKey } from "@/lib/api-keys/authenticateBusinessApiKey";

type BusinessReadAuthentication = {
  businessId: string;
  locationId: string;
  authenticationType: "session" | "apiKey";
  userId?: string;
};

export async function authenticateBusinessReadAccess(
  request: Request,
  allowedRoles: AccessLevel[],
): Promise<NextResponse | BusinessReadAuthentication> {
  const authorizationHeader = request.headers.get("authorization");
  const locationId = request.headers.get("x-location-id");

  if (!locationId) {
    return NextResponse.json({ error: "Missing locationId" }, { status: 400 });
  }

  // ########################
  // ##### CLIENT WEBSITE ###
  // ########################

  /*
   * An Authorization header means this request is
   * explicitly using a Business Platform API key.
   */
  if (authorizationHeader) {
    const apiKeyAuthentication = await authenticateBusinessApiKey(request);

    if (!apiKeyAuthentication) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return {
      businessId: apiKeyAuthentication.businessId,
      locationId: locationId,
      authenticationType: "apiKey",
    };
  }

  // ########################
  // ##### DASHBOARD ########
  // ########################

  /*
   * Dashboard requests means that they must be authenticated by session
   * and verify that they belong to the business
   */
  const businessId = request.headers.get("x-business-id");

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const sessionAuthentication = await authenticateBusinessAccess(
    request,
    businessId,
    allowedRoles,
  );

  if (sessionAuthentication instanceof NextResponse) {
    return sessionAuthentication;
  }

  return {
    userId: sessionAuthentication.userId,
    businessId: sessionAuthentication.businessId,
    locationId: locationId,
    authenticationType: "session",
  };
}
