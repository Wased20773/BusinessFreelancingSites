import type { PrismaClient } from "../generated/prisma/client";

export type businessUser = {
    prisma: PrismaClient,
    businessId: string,
    user: { id: string, name: string | null },
    roleId: string
}

export type Social = {
    prisma: PrismaClient,
    businessId: string,
    domain: string,
    profileName: string,
    url: string,
    icon: string,
};

export type ItemOption = {
    name: string;
    price: number;
};

export type Hour = {
    openTime: string;
    closeTime: string;
    title?: string;
    note?: string;
};

export type Drink = {
    name: string;
    description: string;
    price: number;
}