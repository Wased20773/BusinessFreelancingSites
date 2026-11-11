/*
 *   Helpers for the per-API-key CORS allowlist (BusinessApiKey.allowedOrigins).
 *
 *   An allowed origin is stored as `scheme://host[:port]` with no path, lowercased,
 *   and without the default port. A leading `*.` wildcard matches any subdomain
 *   (but not the apex domain itself):
 *
 *       https://example.com         -> only https://example.com
 *       https://*.example.com       -> https://www.example.com, https://a.b.example.com
 *       http://localhost:5173       -> local development
 *
 *   Plain http:// is only accepted for localhost addresses.
 *
 *   Note: CORS only restricts browsers. Non-browser clients can send any Origin
 *   they like, so this is a guard against other websites using a key, not a
 *   replacement for keeping keys read-only and rate limited.
 **/

export const MAX_ALLOWED_ORIGINS = 10;

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}

/*
 *   Normalizes a developer-provided origin. Returns null when the value is not a
 *   valid origin (has a path, query, credentials, unsupported scheme, ...).
 **/
export function normalizeAllowedOrigin(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/\/$/, "");

  const wildcardMatch = /^(https?):\/\/\*\.(.+)$/.exec(trimmed);
  const candidate = wildcardMatch
    ? `${wildcardMatch[1]}://${wildcardMatch[2]}`
    : trimmed;

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  // URL() accepts characters such as "*" in hostnames, so check explicitly
  if (!/^([a-z0-9-]+\.)*[a-z0-9-]+$|^\[[0-9a-f:.]+\]$/.test(url.hostname)) {
    return null;
  }

  if (url.protocol === "http:" && !isLocalHostname(url.hostname)) {
    return null;
  }

  // An origin never has a path, query, fragment, or credentials
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    candidate.includes("?") ||
    candidate.includes("#")
  ) {
    return null;
  }

  // Wildcards need at least a registrable-looking domain (*.example.com, not *.com)
  if (
    wildcardMatch &&
    !url.hostname.includes(".") &&
    !isLocalHostname(url.hostname)
  ) {
    return null;
  }

  return wildcardMatch ? `${url.protocol}//*.${url.host}` : url.origin;
}

/*
 *   Validates the allowedOrigins value from a request body. Returns the normalized,
 *   de-duplicated list or an error message suitable for a 400 response.
 **/
export function parseAllowedOrigins(
  value: unknown,
): { allowedOrigins: string[] } | { error: string } {
  if (!Array.isArray(value)) {
    return { error: "allowedOrigins must be an array of origins" };
  }

  const allowedOrigins: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") {
      return { error: "allowedOrigins must only contain strings" };
    }

    if (!entry.trim()) {
      continue;
    }

    const normalized = normalizeAllowedOrigin(entry);

    if (!normalized) {
      return {
        error: `"${entry.trim()}" is not a valid origin. Use the format https://example.com (http:// is only allowed for localhost) with no path.`,
      };
    }

    if (!allowedOrigins.includes(normalized)) {
      allowedOrigins.push(normalized);
    }
  }

  if (allowedOrigins.length > MAX_ALLOWED_ORIGINS) {
    return {
      error: `An API key can have at most ${MAX_ALLOWED_ORIGINS} allowed origins`,
    };
  }

  return { allowedOrigins };
}

/*
 *   Checks the Origin header of a browser request against a key's allowlist.
 **/
export function isOriginAllowed(
  origin: string,
  allowedOrigins: string[],
): boolean {
  let url: URL;

  try {
    url = new URL(origin);
  } catch {
    // Includes the literal "null" origin sent by sandboxed iframes and file://
    return false;
  }

  if (url.origin !== origin.toLowerCase()) {
    return false;
  }

  return allowedOrigins.some((allowed) => {
    const wildcardPrefix = `${url.protocol}//*.`;

    if (allowed.startsWith(wildcardPrefix)) {
      const wildcardHost = allowed.slice(wildcardPrefix.length);

      return url.host.endsWith(`.${wildcardHost}`);
    }

    return allowed === url.origin;
  });
}
