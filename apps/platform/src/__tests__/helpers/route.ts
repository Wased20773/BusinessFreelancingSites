export function createRouteContext(itemId: string) {
    return {
        params: Promise.resolve({ itemId }),
    };
}