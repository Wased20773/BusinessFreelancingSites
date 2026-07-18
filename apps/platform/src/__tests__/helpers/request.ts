type RouteMethod = "POST" | "PATCH" | "DELETE";

type CreateJsonRequestOptions = {
    url: string;
    method: RouteMethod;
    body?: unknown;
};

export function createImageRouteRequest({
    itemId = "item-123",
    method,
}: {
    itemId?: string;
    method: RouteMethod;
}): Request {
    return new Request(
        `http://localhost/api/admin/items/${itemId}/image`,
        { method }
    );
}

export function createJsonRequest({
    url,
    method,
    body,
}: CreateJsonRequestOptions): Request {
    return new Request(url, {
        method,
        headers: {
            "Content-Type": "application/json",
        },
        body: body === undefined
            ? undefined
            : JSON.stringify(body),
    });
}