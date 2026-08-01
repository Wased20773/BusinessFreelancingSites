type RouteMethod = "GET" | "POST" | "PATCH" | "DELETE";

type CreateJsonRequestOptions = {
  url: string;
  method: RouteMethod;
  body?: unknown;
  headers?: HeadersInit;
};

export function createImageRouteRequest({
  itemId = "item-123",
  method,
}: {
  itemId?: string;
  method: RouteMethod;
}): Request {
  return new Request(`http://localhost/api/admin/items/${itemId}/image`, {
    method,
  });
}

export function createJsonRequest({
  url,
  method,
  body,
  headers,
}: CreateJsonRequestOptions): Request {
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function createApiKeyRequest({
  url,
  apiKey,
}: {
  url: string;
  apiKey?: string;
}): Request {
  const headers = new Headers();

  if (apiKey !== undefined) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  return new Request(url, {
    method: "GET",
    headers,
  });
}
