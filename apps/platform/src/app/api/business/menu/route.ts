import { getBusinessResponse, getSlug } from '../../route_helper';

// GET /api/business/menu
export async function GET(request: Request) {
    const slug: string = getSlug(request);

    return await getBusinessResponse(
        slug,
        {
            categories: {
                where: { parentId: null },
                orderBy: {
                    order: 'asc',
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    order: true,
                    isVisible: true,
                    createdAt: true,
                    updatedAt: true,
                    items: {
                        orderBy: {
                            order: 'asc',
                        },
                        select: {
                            id: true,
                            categoryId: true,
                            name: true,
                            description: true,
                            containsList: true,
                            calories: true,
                            price: true,
                            order: true,
                            isAvailable: true,
                            slug: true,
                            imageKey: true,
                            createdAt: true,
                            updatedAt: true,
                            options: {
                                orderBy: {
                                    order: 'asc',
                                },
                                select: {
                                    id: true,
                                    name: true,
                                    price: true,
                                    order: true,
                                    isAvailable: true,
                                    createdAt: true,
                                    updatedAt: true,
                                },
                            },
                        },
                    },
                },
            },
        },
        "menu"
    );
}