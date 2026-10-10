type RouteMethod = "GET" | "POST" | "PATCH" | "DELETE";

type CreateJsonRequestOptions = {
  url: string;
  method: RouteMethod;
  body?: unknown;
  headers?: HeadersInit;
};

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

/*
 * Builds a multipart/form-data request. String values are sent as plain
 * fields and Files as file uploads.
 */
export function createFormDataRequest({
  url,
  method,
  fields,
}: {
  url: string;
  method: RouteMethod;
  fields: Record<string, string | File>;
}): Request {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  return new Request(url, {
    method,
    body: formData,
  });
}

export function createApiKeyRequest({
  url,
  apiKey,
  headers,
}: {
  url: string;
  apiKey?: string;
  headers?: HeadersInit;
}): Request {
  const requestHeaders = new Headers(headers);

  if (apiKey !== undefined) {
    requestHeaders.set("Authorization", `Bearer ${apiKey}`);
  }

  return new Request(url, {
    method: "GET",
    headers: requestHeaders,
  });
}
