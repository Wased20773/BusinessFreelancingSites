import type { PrismaClient } from "../generated/prisma/client";
import { DayOfWeek } from "@business-freelancer/database";
import { businessUser, Drink, Hour, ItemOption, Social } from "./types";


export async function createUser({
    prisma,
    email,
    name,
    username,
}: {
    prisma: PrismaClient,
    email: string,
    name: string,
    username?: string,
}) {
    try {
        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (existingUser) {
            console.log(`\t[=] ${existingUser.name ?? email} already exists`);
            return existingUser;
        }

        const user = await prisma.user.create({
            data: {
                name,
                username,
                email,
            },
            select: {
                id: true,
                name: true,
            },
        });

        console.log(`\t[+] ${user.name ?? email} has been created`);

        return user;
    } catch (error) {
        throw new Error(
            `[x] Failed to find or create ${name}`,
            { cause: error }
        );
    }
}

export async function createBusinessUser({
    prisma,
    businessId,
    user,
    roleId
}: businessUser) {
    try {
        const link = await prisma.businessUser.upsert({
            where: {
                businessId_userId: {
                    businessId,
                    userId: user.id,
                },
            },
            update: {},
            create: {
                businessId,
                userId: user.id,
                roleId,
            },
        });

        console.log(`\t[+] ${user.name ?? user.id} has been linked to the business`);

        return link;
    } catch (error) {
        throw new Error(
            `[x] Failed to link ${user.name ?? user.id} to the business`,
            { cause: error }
        );
    }
}

export async function createSocial({
    prisma,
    businessId,
    dns,
    profileName,
    url,
    icon,
}: Social) {
    try {
        const existingSocial = await prisma.social.findFirst({
            where: {
                businessId,
                dns,
            },
        });

        if (existingSocial) {
            console.log(`\t[=] ${dns} social already exists`);
            return existingSocial;
        }

        const social = await prisma.social.create({
            data: {
                businessId,
                dns,
                profileName,
                url,
                icon,
            },
        });

        console.log(`\t[+] ${dns} social created`);

        return social;
    } catch (error) {
        throw new Error(
            `[x] Failed to create the ${dns} social`,
            { cause: error }
        );
    }
}

export async function createLocationDay({
    prisma,
    locationId,
    dayOfWeek,
    isClosed = false,
}: {
    prisma: PrismaClient,
    locationId: string,
    dayOfWeek: DayOfWeek,
    isClosed?: boolean,
}) {
    try {
        const existingDay = await prisma.locationDay.findUnique({
            where: {
                locationId_dayOfWeek: {
                    locationId,
                    dayOfWeek,
                },
            },
        });

        if (existingDay) {
            console.log(`\t[=] ${dayOfWeek} already exists`);
            return existingDay;
        }

        const locationDay = await prisma.locationDay.create({
            data: {
                locationId,
                dayOfWeek,
                isClosed,
            },
        });

        console.log(`\t[+] Added ${dayOfWeek}`);

        return locationDay;
    } catch (error) {
        throw new Error(
            `[x] Failed to create ${dayOfWeek} for location ${locationId}`,
            { cause: error }
        );
    }
}

export async function createHoursForDays({
    prisma,
    days,
    hours,
}: {
    prisma: PrismaClient
    days: { id: string; dayOfWeek: DayOfWeek }[];
    hours: Hour[];
}) {
    for (const day of days) {
        for (const hour of hours) {
            await createHour({
                prisma,
                locationDayId: day.id,
                openTime: hour.openTime,
                closeTime: hour.closeTime,
                title: hour.title,
                note: hour.note,
            });
        }
    }
}

async function createHour({
    prisma,
    locationDayId,
    openTime,
    closeTime,
    title,
    note,
}: {
    prisma: PrismaClient,
    locationDayId: string,
    openTime: string,
    closeTime: string,
    title?: string,
    note?: string,
}) {
    try {
        const existingHour = await prisma.hour.findUnique({
            where: {
                locationDayId_openTime_closeTime: {
                    locationDayId,
                    openTime,
                    closeTime,
                },
            },
        });

        if (existingHour) {
            console.log(
                `\t[=] ${openTime}-${closeTime} already exists for ${locationDayId}`
            );

            return existingHour;
        }

        const hour = await prisma.hour.create({
            data: {
                locationDayId,
                openTime,
                closeTime,
                title,
                note,
            },
        });

        console.log(
            `\t[+] Added ${openTime}-${closeTime} for ${locationDayId}`
        );

        return hour;
    } catch (error) {
        throw new Error(
            `[x] Failed to create ${openTime}-${closeTime} for location day ${locationDayId}`,
            { cause: error }
        );
    }
}

export function createSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function seedItemWithOptions({
    prisma,
    businessId,
    categoryId,
    name,
    description,
    price = 0,
    order,
    options,
}: {
    prisma: PrismaClient;
    businessId: string;
    categoryId: string;
    name: string;
    description?: string;
    price?: number;
    order: number;
    options: ItemOption[];
}) {
    try {
        const slug = createSlug(name);

        const existingItem = await prisma.item.findUnique({
            where: {
                businessId_slug: {
                    businessId,
                    slug,
                },
            },
            select: {
                id: true,
            },
        });

        const item = await prisma.item.upsert({
            where: {
                businessId_slug: {
                    businessId,
                    slug,
                },
            },
            update: {
                categoryId,
                name,
                description,
                price,
                order,
            },
            create: {
                businessId,
                categoryId,
                name,
                description,
                price,
                order,
                slug,
                containsList: [],
            },
        });

        console.log(
            existingItem
                ? `\t[=] Item "${name}" already exists and was updated`
                : `\t[+] Item "${name}" has been created`
        );

        for (const [index, option] of options.entries()) {
            try {
                const existingOption = await prisma.itemOption.findUnique({
                    where: {
                        itemId_name: {
                            itemId: item.id,
                            name: option.name,
                        },
                    },
                    select: {
                        id: true,
                    },
                });

                await prisma.itemOption.upsert({
                    where: {
                        itemId_name: {
                            itemId: item.id,
                            name: option.name,
                        },
                    },
                    update: {
                        price: option.price,
                        order: index + 1,
                        isAvailable: true,
                    },
                    create: {
                        itemId: item.id,
                        name: option.name,
                        price: option.price,
                        order: index + 1,
                        isAvailable: true,
                    },
                });

                console.log(
                    existingOption
                        ? `\t\t[=] Option "${option.name}" already exists and was updated`
                        : `\t\t[+] Option "${option.name}" has been created`
                );
            } catch (error) {
                throw new Error(
                    `[x] Failed to seed option "${option.name}" for item "${name}"`,
                    { cause: error }
                );
            }
        }

        return item;
    } catch (error) {
        throw new Error(
            `[x] Failed to seed item "${name}"`,
            { cause: error }
        );
    }
}

export async function seedCategory({
    prisma,
    businessId,
    parentId = null,
    name,
    description,
    order,
}: {
    prisma: PrismaClient;
    businessId: string;
    parentId?: string | null;
    name: string;
    description?: string;
    order: number;
}) {
    try {
        const existingCategory = await prisma.category.findFirst({
            where: {
                businessId,
                parentId,
                name,
            },
        });

        if (existingCategory) {
            const category = await prisma.category.update({
                where: {
                    id: existingCategory.id,
                },
                data: {
                    description,
                    order,
                },
            });

            console.log(
                `\t[=] Category "${name}" already exists and was updated`
            );

            return category;
        }

        const category = await prisma.category.create({
            data: {
                businessId,
                parentId,
                name,
                description,
                order,
            },
        });

        console.log(`\t[+] Category "${name}" has been created`);

        return category;
    } catch (error) {
        throw new Error(
            `[x] Failed to seed category "${name}"`,
            { cause: error }
        );
    }
}

export async function seedDrinks({
    prisma,
    businessId,
    categoryId,
    drinks,
}: {
    prisma: PrismaClient;
    businessId: string;
    categoryId: string;
    drinks: Drink[];
}) {
    try {
        for (const [index, drink] of drinks.entries()) {
            try {
                const slug = createSlug(drink.name);

                const existingDrink = await prisma.item.findUnique({
                    where: {
                        businessId_slug: {
                            businessId,
                            slug,
                        },
                    },
                    select: {
                        id: true,
                    },
                });

                await prisma.item.upsert({
                    where: {
                        businessId_slug: {
                            businessId,
                            slug,
                        },
                    },
                    update: {
                        categoryId,
                        name: drink.name,
                        description: drink.description,
                        price: drink.price,
                        order: index + 1,
                    },
                    create: {
                        businessId,
                        categoryId,
                        name: drink.name,
                        description: drink.description,
                        containsList: [],
                        price: drink.price,
                        order: index + 1,
                        slug,
                    },
                });

                console.log(
                    existingDrink
                        ? `\t[=] Drink "${drink.name}" already exists and was updated`
                        : `\t[+] Drink "${drink.name}" has been created`
                );
            } catch (error) {
                throw new Error(
                    `Failed to seed drink "${drink.name}"`,
                    { cause: error }
                );
            }
        }
    } catch (error) {
        throw new Error(
            `[x] Failed to seed drinks for category ${categoryId}`,
            { cause: error }
        );
    }
}