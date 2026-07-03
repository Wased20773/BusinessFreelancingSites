// Currently Needs to be done after S3 Buckets is created
import { NextResponse } from "next/server";

// PATCH /api/admin/items/[itemId]/image
export async function PATCH(): Promise<NextResponse> {
    return NextResponse.json(
        { error: "Image upload route is not implemented yet" },
        { status: 501 }
    );
}