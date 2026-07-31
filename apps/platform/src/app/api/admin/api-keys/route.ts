import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { createBusinessApiKey } from "@/lib/api-keys/createBusinessApiKey";
import { prisma } from "@/lib/prisma";

type CreateApiKeyBody = {
  name?: unknown;
};

// GET /api/admin/api-keys
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessAccess(request, [
      AccessLevel.developer,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const apiKeys = await prisma.businessApiKey.findMany({
      where: {
        businessId: authentication.businessId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error("Failed to retrieve business API keys:", error);

    return NextResponse.json(
      { error: "Failed to retrieve business API keys" },
      { status: 500 },
    );
  }
}

// POST /api/admin/api-keys
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessAccess(request, [
      AccessLevel.developer,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const body = (await request.json()) as CreateApiKeyBody;

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "API key name is required" },
        { status: 400 },
      );
    }

    const createdKey = await createBusinessApiKey({
      businessId: authentication.businessId,
      name: body.name.trim(),
    });

    return NextResponse.json(
      {
        apiKey: createdKey.apiKey,
        key: createdKey.credential,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create business API key:", error);

    return NextResponse.json(
      { error: "Failed to create business API key" },
      { status: 500 },
    );
  }
}
