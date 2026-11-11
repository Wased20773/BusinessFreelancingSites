/**
 * @jest-environment node
 */

import {
  MAX_ALLOWED_ORIGINS,
  isOriginAllowed,
  normalizeAllowedOrigin,
  parseAllowedOrigins,
} from "@/lib/api-keys/allowedOrigins";

describe("normalizeAllowedOrigin", () => {
  it.each([
    ["https://example.com", "https://example.com"],
    ["  HTTPS://Example.COM/  ", "https://example.com"],
    ["https://example.com:443", "https://example.com"],
    ["https://example.com:8443", "https://example.com:8443"],
    ["https://*.example.com", "https://*.example.com"],
    ["https://*.Example.com:8443", "https://*.example.com:8443"],
    ["http://localhost:5173", "http://localhost:5173"],
    ["http://127.0.0.1:3001", "http://127.0.0.1:3001"],
    ["http://tacos.localhost:3001", "http://tacos.localhost:3001"],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizeAllowedOrigin(input)).toBe(expected);
  });

  it.each([
    "*",
    "example.com",
    "http://example.com",
    "https://example.com/menu",
    "https://example.com?x=1",
    "https://example.com#top",
    "https://user:pass@example.com",
    "ftp://example.com",
    "https://*.com",
    "https://*example.com",
    "not a url",
    "null",
  ])("rejects %p", (input) => {
    expect(normalizeAllowedOrigin(input)).toBeNull();
  });
});

describe("parseAllowedOrigins", () => {
  it("normalizes, de-duplicates, and skips blank entries", () => {
    expect(
      parseAllowedOrigins([
        "https://example.com/",
        "https://EXAMPLE.com",
        "  ",
        "http://localhost:5173",
      ]),
    ).toEqual({
      allowedOrigins: ["https://example.com", "http://localhost:5173"],
    });
  });

  it("rejects non-arrays", () => {
    expect(parseAllowedOrigins("https://example.com")).toEqual({
      error: "allowedOrigins must be an array of origins",
    });
  });

  it("rejects non-string entries", () => {
    expect(parseAllowedOrigins([1])).toEqual({
      error: "allowedOrigins must only contain strings",
    });
  });

  it("names the invalid origin in the error", () => {
    const result = parseAllowedOrigins(["https://example.com/menu"]);

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain(
      "https://example.com/menu",
    );
  });

  it("limits the number of origins", () => {
    const origins = Array.from(
      { length: MAX_ALLOWED_ORIGINS + 1 },
      (_, index) => `https://site${index}.example.com`,
    );

    expect(parseAllowedOrigins(origins)).toEqual({
      error: `An API key can have at most ${MAX_ALLOWED_ORIGINS} allowed origins`,
    });
  });
});

describe("isOriginAllowed", () => {
  const allowed = [
    "https://example.com",
    "https://*.preview.example.com",
    "http://localhost:5173",
  ];

  it.each([
    "https://example.com",
    "https://pr-1.preview.example.com",
    "https://a.b.preview.example.com",
    "http://localhost:5173",
  ])("allows %p", (origin) => {
    expect(isOriginAllowed(origin, allowed)).toBe(true);
  });

  it.each([
    "https://www.example.com",
    "http://example.com",
    "https://example.com:8443",
    "https://preview.example.com",
    "https://evilpreview.example.com",
    "https://example.com.evil.com",
    "http://localhost:3000",
    "null",
    "",
  ])("blocks %p", (origin) => {
    expect(isOriginAllowed(origin, allowed)).toBe(false);
  });

  it("blocks every origin when the list is empty", () => {
    expect(isOriginAllowed("https://example.com", [])).toBe(false);
  });
});
