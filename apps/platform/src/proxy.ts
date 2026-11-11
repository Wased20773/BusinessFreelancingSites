import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/*
 *   CORS for the public client-website API (/api/business/*).
 *
 *   Preflight (OPTIONS) requests do not carry the Authorization value, so the
 *   API key and its allowedOrigins cannot be looked up here. Instead:
 *
 *   1. Preflight is answered for any origin, only advertising GET and the
 *      headers the public API reads.
 *   2. Actual requests that carry an API key get the caller's origin echoed in
 *      Access-Control-Allow-Origin. The route itself enforces the key's
 *      allowedOrigins (authenticateBusinessApiKey) and answers 403 before any
 *      data is read, so a blocked origin only ever sees the error message.
 *   3. Requests without an Authorization header are dashboard (session cookie)
 *      requests and never get CORS headers, so other sites can't read them.
 *
 *   Access-Control-Allow-Credentials is intentionally never sent.
 **/

const PREFLIGHT_HEADERS = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-Location-Id, Content-Type",
  "Access-Control-Max-Age": "600",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
        ...PREFLIGHT_HEADERS,
      },
    });
  }

  const response = NextResponse.next();

  response.headers.append("Vary", "Origin");

  if (request.headers.has("authorization")) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  return response;
}

export const config = {
  matcher: "/api/business/:path*",
};
