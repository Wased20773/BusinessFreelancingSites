/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function createRequest(
  method: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost:3000/api/business/menu", {
    method,
    headers,
  });
}

describe("proxy (public API CORS)", () => {
  it("leaves requests without an Origin header untouched", () => {
    const response = proxy(createRequest("GET"));

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("answers preflight requests with the allowed methods and headers", () => {
    const response = proxy(
      createRequest("OPTIONS", {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,x-location-id",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, OPTIONS",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  it("echoes the origin on API-key requests", () => {
    const response = proxy(
      createRequest("GET", {
        Origin: "http://localhost:5173",
        Authorization: "Bearer bp_valid-key",
      }),
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
    expect(response.headers.get("Vary")).toContain("Origin");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  it("never adds CORS headers to session (cookie) requests", () => {
    const response = proxy(
      createRequest("GET", {
        Origin: "https://evil-example.com",
        Cookie: "authjs.session-token=abc",
      }),
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
