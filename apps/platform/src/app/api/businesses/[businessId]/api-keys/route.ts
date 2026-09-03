import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { createBusinessApiKey } from "@/lib/api-keys/createBusinessApiKey";
import { prisma } from "@/lib/prisma";

type CreateApiKeyBody = {
  name?: unknown;
};

// GET /api/businesses/[businessId]/api-keys
export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [
        AccessLevel.developer,
        AccessLevel.owner,
        AccessLevel.admin,
        AccessLevel.staff,
      ],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const apiKeys = await prisma.businessApiKey.findMany({
      where: {
        businessId,
      },
      select: {
        id: true,
        businessId: true,
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

    return NextResponse.json(apiKeys, { status: 200 });
  } catch (error) {
    console.error("Failed to retrieve business API keys:", error);

    return NextResponse.json(
      {
        error: "Failed to retrieve business API keys",
      },
      { status: 500 },
    );
  }
}

// POST /api/businesses/[businessId]/api-keys
export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [AccessLevel.developer],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const body = (await request.json()) as CreateApiKeyBody;

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "API key name is required" },
        { status: 400 },
      );
    }

    const createdKey = await createBusinessApiKey({
      businessId,
      name: body.name.trim(),
    });

    /*
     * The complete credential is intentionally
     * returned only when the key is created.
     */
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
