import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

export function mockSuccessfulAuthentication(
    businessId = "business-123"
): void {
    mockedAuthenticateBusinessAccess.mockResolvedValue({
        businessId,
    } as never);
}