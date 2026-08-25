// import { NextResponse } from "next/server";
// import { getBusinessResponse } from "../route_helper";
// import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
// import { AccessLevel } from "@business-freelancer/database";

// // GET /api/business
// export async function GET(request: Request): Promise<NextResponse> {
//   const authentication = await authenticateBusinessReadAccess(request, [
//     AccessLevel.developer,
//     AccessLevel.owner,
//     AccessLevel.admin,
//     AccessLevel.staff,
//   ]);

//   if (authentication instanceof NextResponse) return authentication;

//   return await getBusinessResponse(
//     authentication.businessId,
//     {
//       id: true,
//       name: true,
//       slug: true,
//       domain: true,
//       createdAt: true,
//       updatedAt: true,
//     },
//     "business",
//   );
// }
