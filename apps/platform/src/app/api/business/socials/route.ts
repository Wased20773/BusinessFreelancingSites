import { NextResponse } from "next/server";
import { getBusinessResponse } from "../../route_helper";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { AccessLevel } from "@business-freelancer/database";
import { getObjectUrl } from "@/lib/s3/get-url";

type SocialResponse = {
  id: string;
  domain: string;
  profileName: string;
  url: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
};

// GET /api/business/socials
export async function GET(request: Request): Promise<NextResponse> {
  const authentication = await authenticateBusinessReadAccess(request, [
    AccessLevel.developer,
    AccessLevel.owner,
    AccessLevel.admin,
    AccessLevel.staff,
  ]);

  if (authentication instanceof NextResponse) return authentication;

  const response = await getBusinessResponse(
    authentication.businessId,
    {
      socials: {
        select: {
          id: true,
          domain: true,
          profileName: true,
          url: true,
          icon: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    "social",
  );

  if (!response.ok) return response;

  const data = (await response.json()) as {
    socials: SocialResponse[];
  };

  const socials = await Promise.all(
    data.socials.map(async (social) => ({
      ...social,
      icon: await getObjectUrl(social.icon),
    })),
  );

  return NextResponse.json({
    ...data,
    socials,
  });
}
