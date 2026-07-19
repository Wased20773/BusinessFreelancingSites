import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

export function mockSuccessfulAuthentication(
    businessId = "business-123",
    userId = "user-123",
    slug = "business-slug"
): void {
    mockedAuthenticateBusinessAccess.mockResolvedValue({
        userId,
        businessId,
        slug,
    } as never);
}