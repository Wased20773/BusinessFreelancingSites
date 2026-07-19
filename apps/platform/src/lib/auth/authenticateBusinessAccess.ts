import { NextResponse } from 'next/server';
import { AccessLevel } from "@business-freelancer/database";

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getSlug } from '@/app/api/route_helper';
import { Session } from 'next-auth';


// Purpose: Authenticate the currently logged-in user with Auth.js
//          and verify that the user has access to the requested
//          business and that access levels are within range.
//
// Return: 
//  - NextResponse -> whenever theres failure
//  - { businessId: string; slug: string }
export async function authenticateBusinessAccess(
    request: Request,
    allowedRoles: AccessLevel[]
): Promise<NextResponse | { userId: string, businessId: string; slug: string }> {
    try {
        // 1. Ask Auth.js if there is a logged-in user
        const session: Session | null = await auth();
    
        // 2. If there is no logged-in user, block the request
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized Access' },
                { status: 401 }
            );
        }
    
        // 3. Get the business slug from the request
        const slug = getSlug(request);
    
        // 4. Look for a BusinessUser record that connects:
        //  - this logged-in user
        //  - this specific business
        //  - one of the allowed roles
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                user: {
                    email: session.user.email,
                },
                business: {
                    slug: slug,
                },
                role: {
                    accessLevel: { in: allowedRoles }
                },
            },
            select: {
                business: {
                    select: {
                        id: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                    }
                }
            },
        });
    
        // 5. Check if they did not meet the requirements
        if (!businessUser) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }
    
        // 6. Return userId, businessId & slug for upcoming queries
        return { 
            userId: businessUser.user.id,
            businessId: businessUser.business.id,
            slug: slug,
        }
    } catch (error) {
        console.error("Failed to authenticate:", error);
        
        return NextResponse.json(
            { error: "Failed to authenticate"},
            { status: 400 }
        )
    }
}