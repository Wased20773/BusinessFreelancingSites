import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateBusinessReadAccess } from "../../route_helper";
import { AccessLevel } from "@business-freelancer/database";

/*
 *   Note: This is a test api route, it will not be pushed into production. it is
 *         meant to serve as a test to view ALL data relating to a business. Make
 *         sure to DELETE this file and its folder after no longer testing.
 *
 **/

// GET /api/business/full
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const business = await prisma.business.findUnique({
      where: { id: authentication.businessId },
      include: {
        users: {
          include: {
            user: true,
            role: true,
          },
        },
        categories: {
          where: { parentId: null },
          include: {
            items: {
              include: {
                options: true,
              },
            },
            subcategories: {
              include: {
                items: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        contacts: true,
        socials: true,
        locations: {
          include: {
            days: {
              include: {
                hours: true,
              },
            },
          },
        },
        items: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(business, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to connect to servers when getting business: ${error}` },
      { status: 500 },
    );
  }
}
