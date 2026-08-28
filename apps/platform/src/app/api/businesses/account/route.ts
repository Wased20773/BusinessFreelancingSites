import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/account
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account could not be found" },
        { status: 404 },
      );
    }

    return NextResponse.json(user, {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to fetch account details:", error);

    return NextResponse.json(
      { error: "Failed to fetch account details" },
      { status: 500 },
    );
  }
}

// PATCH /api/account
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const updateData: {
      name?: string;
      username?: string;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 },
        );
      }

      updateData.name = body.name.trim();
    }

    if (body.username !== undefined) {
      if (typeof body.username !== "string" || !body.username.trim()) {
        return NextResponse.json(
          { error: "Username is required" },
          { status: 400 },
        );
      }

      updateData.username = body.username.trim();
    }

    if (body.name === undefined && body.username === undefined) {
      return NextResponse.json(
        { error: "No supported fields were provided" },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Failed to update user profile:", error);

    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 },
    );
  }
}
