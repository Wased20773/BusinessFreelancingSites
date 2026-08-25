import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { authenticateBusinessApiKey } from "@/lib/api-keys/authenticateBusinessApiKey";

type LocationReadAuthentication = {
  businessId: string;
  locationId: string;
  authenticationType: "session" | "apiKey";
  userId?: string;
};

type BusinessReadAuthentication = {
  businessId: string;
  authenticationType: "session" | "apiKey";
  userId?: string;
};

type BusinessReadAccessOptions = {
  requireLocation: false;
};

// Location is required by default
export async function authenticateBusinessReadAccess(
  request: Request,
  allowedRoles: AccessLevel[],
): Promise<NextResponse | LocationReadAuthentication>;

// Business-level request
export async function authenticateBusinessReadAccess(
  request: Request,
  allowedRoles: AccessLevel[],
  options: BusinessReadAccessOptions,
): Promise<NextResponse | BusinessReadAuthentication>;

// Implementation
export async function authenticateBusinessReadAccess(
  request: Request,
  allowedRoles: AccessLevel[],
  options?: BusinessReadAccessOptions,
): Promise<
  NextResponse | LocationReadAuthentication | BusinessReadAuthentication
> {
  const requireLocation = options?.requireLocation !== false;

  const authorizationHeader = request.headers.get("authorization");
  const locationId = request.headers.get("x-location-id");

  if (requireLocation && !locationId) {
    return NextResponse.json({ error: "Missing locationId" }, { status: 400 });
  }

  // Client website
  if (authorizationHeader) {
    const apiKeyAuthentication = await authenticateBusinessApiKey(request);

    if (!apiKeyAuthentication) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (locationId) {
      return {
        businessId: apiKeyAuthentication.businessId,
        locationId: locationId,
        authenticationType: "apiKey",
      };
    }

    return {
      businessId: apiKeyAuthentication.businessId,
      authenticationType: "apiKey",
    };
  }

  // Dashboard
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

  if (locationId) {
    return {
      userId: sessionAuthentication.userId,
      businessId: sessionAuthentication.businessId,
      locationId: locationId,
      authenticationType: "session",
    };
  }

  return {
    userId: sessionAuthentication.userId,
    businessId: sessionAuthentication.businessId,
    authenticationType: "session",
  };
}
