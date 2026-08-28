import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { prisma } from "@/lib/prisma";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";

type RouteContext = {
  params: Promise<{
    businessId: string;
    apiKeyId: string;
  }>;
};

type UpdateApiKeyBody = {
  name?: unknown;
  isActive?: unknown;
};

// PATCH /api/businesses/[businessId]/api-keys/[apiKeyId]
export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { businessId, apiKeyId } = await context.params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    if (!apiKeyId) {
      return NextResponse.json({ error: "Missing apiKeyId" }, { status: 400 });
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [AccessLevel.developer],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const body = (await request.json()) as UpdateApiKeyBody;

    const updateData: {
      name?: string;
      isActive?: boolean;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: "API key name must be a non-empty string" },
          { status: 400 },
        );
      }

      updateData.name = body.name.trim();
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { error: "isActive must be a boolean" },
          { status: 400 },
        );
      }

      updateData.isActive = body.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Provide a name or isActive value to update" },
        { status: 400 },
      );
    }

    // Make sure this API key actually belongs
    // to the selected business.
    const existingKey = await prisma.businessApiKey.findFirst({
      where: {
        id: apiKeyId,
        businessId,
      },

      select: {
        id: true,
      },
    });

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const updatedKey = await prisma.businessApiKey.update({
      where: {
        id: existingKey.id,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedKey, { status: 200 });
  } catch (error) {
    console.error("Failed to update business API key:", error);

    return NextResponse.json(
      { error: "Failed to update business API key" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/api-keys/[apiKeyId]
export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { businessId, apiKeyId } = await context.params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    if (!apiKeyId) {
      return NextResponse.json({ error: "Missing apiKeyId" }, { status: 400 });
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [AccessLevel.owner, AccessLevel.admin],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    // Make sure this API key actually belongs
    // to the selected business.
    const existingKey = await prisma.businessApiKey.findFirst({
      where: {
        id: apiKeyId,
        businessId,
      },

      select: {
        id: true,
      },
    });

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    await prisma.businessApiKey.delete({
      where: {
        id: existingKey.id,
      },
    });

    return NextResponse.json(
      { message: "API key deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete business API key:", error);

    return NextResponse.json(
      { error: "Failed to delete business API key" },
      { status: 500 },
    );
  }
}
