type ImageRouteMethod = "POST" | "PATCH" | "DELETE";

export function createImageRouteRequest({
    itemId = "item-123",
    method,
}: {
    itemId?: string;
    method: ImageRouteMethod;
}): Request {
    return new Request(
        `http://localhost/api/admin/items/${itemId}/image`,
        { method }
    );
}