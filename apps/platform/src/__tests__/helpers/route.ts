export function createRouteContext<
    TParams extends Record<string, string>
>(params: TParams) {
    return {
        params: Promise.resolve(params),
    };
}