import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import {
  exportBusiness,
  exportFileName,
} from "@/lib/businessData/exportBusiness";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// GET /api/businesses/[businessId]/export
// The "Download Business JSON" file on the API Reference page: all of the
// business's dashboard data, grouped by location. Dashboard only (signed in);
// API keys can't call it.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [
        AccessLevel.owner,
        AccessLevel.admin,
        AccessLevel.staff,
        AccessLevel.developer,
      ],
    );

    if (authentication instanceof NextResponse) return authentication;

    const data = await exportBusiness(authentication.businessId);

    if (!data) {
      return NextResponse.json(
        { error: "Business could not be found" },
        { status: 404 },
      );
    }

    // Indented, so the downloaded file is readable.
    return new NextResponse(`${JSON.stringify(data, null, 2)}\n`, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${exportFileName(data.business.slug)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export business data:", error);

    return NextResponse.json(
      { error: "Failed to export business data" },
      { status: 500 },
    );
  }
}
