import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Creates database client that talks to the Prisma Postgres database
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function main() {
    // ################################
    // ##### Create Access Levels #####
    // ################################
    let ownerRole = await prisma.role.findFirst({
        where: { accessLevel: "owner" },
    });
    let adminRole = await prisma.role.findFirst({
        where: { accessLevel: "admin"}
    })

    if (!ownerRole) {
        ownerRole = await prisma.role.create({
            data: {
                accessLevel: "owner",
                description: "Full business-level access. Can add, update, and change business content, manage users/roles, and transfer ownership.",
            },
        });
    }

    if (!adminRole) {
        adminRole = await prisma.role.create({
            data: {
                accessLevel: "admin",
                description: "Can add, update, and delete business content. Can manage general user information, but cannot remove an owner, or transfer ownership."
            }
        })
    }

    // ##################################
    // ##### Create Unique Business #####
    // ##################################
    const business = await prisma.business.upsert({
        where: { slug: "tacos-el-guero" },
        update: {},
        create: {
            name: "Tacos El Guero",
            slug: "tacos-el-guero",
            domain: "tacoselgueropdx.com",
        },
    });

    // #############################
    // ##### Find/Create Users #####
    // #############################
    const ownerUser = await prisma.user.upsert({
        where: { email: "owner@tacoselgueropdx.com" },
        update: {},
        create: {
            name: "Payo",
            username: "perrorabioso",
            email: "owner@tacoselgueropdx.com",
            passwordHash: "owner-only-password-hash",
        },
    });

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@tacoselgueropdx.com" },
        update: {},
        create: {
            name: "Araceli",
            username: "princesa",
            email: "admin@tacoselgueropdx.com",
            passwordHash: "admin-only-password-hash",
        },
    });

    // #################################
    // ##### Create the Join Table #####
    // #################################
    await prisma.businessUser.upsert({
        where: {
            businessId_userId: {
                businessId: business.id,
                userId: ownerUser.id,
            },
        },
        update: { roleId: ownerRole.id },
        create: {
            businessId: business.id,
            userId: ownerUser.id,
            roleId: ownerRole.id,
        },
    });

    await prisma.businessUser.upsert({
        where: {
            businessId_userId: {
                businessId: business.id,
                userId: adminUser.id,
            },
        },
        update: { roleId: adminRole.id },
        create: {
            businessId: business.id,
            userId: adminUser.id,
            roleId: adminRole.id,
        },
    });

    // ##########################
    // ##### Create Contact #####
    // ##########################
    let contact = await prisma.contact.findFirst({
        where: { businessId: business.id },
    });

    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                businessId: business.id,
                phoneNumber: "503-000-0000",
                email: "contact@tacoselgueropdx.com",
                isPersonal: false,
            },
        });
    }

    // #######################
    // ##### Add Socials #####
    // #######################
    let socialInstagram = await prisma.social.findFirst({
        where: { 
            businessId: business.id,
            name: "Instagram",
        },
    });

    let socialFacebook = await prisma.social.findFirst({
        where: {
            businessId: business.id,
            name: "Facebook",
        }
    });

    if (!socialInstagram) {
        socialInstagram = await prisma.social.create({
            data: {
                businessId: business.id,
                name: "Instagram",
                profileName: "tacoselgueropdx",
                url: "tacos-el-guero-pdx",
                icon: "businesses/icons/socials/instagram.webp"
            }
        })
    }

    if (!socialFacebook) {
        socialFacebook = await prisma.social.create({
            data: {
                businessId: business.id,
                name: "Facebook",
                profileName: "tacoselgueropdx",
                url: "tacos-el-guero-pdx",
                icon: "businesses/icons/socials/facebook.webp"
            }
        })
    }

    // #########################
    // ##### Add Locations #####
    // #########################
    let location = await prisma.location.findFirst({
        where: { businessId: business.id },
    });

    if (!location) {
        location = await prisma.location.create({
            data: {
                businessId: business.id,
                address: "123 Example St",
                city: "Portland",
                state: "OR",
                zip: "97218",
                country: "USA",
                parking: true,
                isActive: true,
            },
        });
    }

    const existingHours = await prisma.locationHour.findMany({
        where: { locationId: location.id }
    });

    if (existingHours.length === 0) {
        await prisma.locationHour.createMany({
            data: [
                {
                    locationId: location.id,
                    dayOfWeek: "Monday",
                    openTime: "11:00",
                    closeTime: "22:00",
                    isClosed: false
                },
                {
                    locationId: location.id,
                    dayOfWeek: "Tuesday",
                    openTime: "11:00",
                    closeTime: "22:00",
                    isClosed: false,
                },
                {
                    locationId: location.id,
                    dayOfWeek: "Wednesday",
                    openTime: "11:00",
                    closeTime: "22:00",
                    isClosed: false
                },
                {
                    locationId: location.id,
                    dayOfWeek: "Thursday",
                    openTime: "11:00",
                    closeTime: "22:00",
                    isClosed: false
                },
                {
                    locationId: location.id,
                    dayOfWeek: "Friday",
                    openTime: "11:00",
                    closeTime: "22:00",
                    isClosed: false
                },
                {
                    locationId: location.id,
                    dayOfWeek: "Saturday",
                    openTime: "12:00",
                    closeTime: "22:00",
                    isClosed: false
                },
                {
                    locationId: location.id,
                    dayOfWeek: "Sunday",
                    openTime: null,
                    closeTime: null,
                    isClosed: true
                },
            ],
        });
    }

    // #############################
    // ##### Create Categories #####
    // #############################
    const toppingsCategory = await prisma.category.upsert({
        where: {
            businessId_name: {
                businessId: business.id,
                name: "Toppings",
            },
        },
        update: {},
        create: {
            businessId: business.id,
            name: "Toppings",
            description: "For tacos, Burrito, Quesadilla, or Nachos you must pay per added topping.",
            order: 1,
            isVisible: true,
        },
    });

    const drinksCategory = await prisma.category.upsert({
        where: {
            businessId_name: {
                businessId: business.id,
                name: "Drinks",
            },
        },
        update: {},
        create: {
            businessId: business.id,
            name: "Drinks",
            description: "Cans (12oz), Bottles/water, and Traditional Mexican Drinks.",
            order: 2,
            isVisible: true,
        },
    });

    const ordersCategory = await prisma.category.upsert({
        where: {
            businessId_name: {
                businessId: business.id,
                name: "Orders",
            },
        },
        update: {},
        create: {
            businessId: business.id,
            name: "Orders",
            description: null,
            order: 3,
            isVisible: true,
        }
    })

    // ##########################
    // ##### Add Menu Items #####
    // ##########################
    await prisma.item.upsert({
        where: {
            businessId_slug: {
                businessId: business.id,
                slug: "each-taco",
            },
        },
        update: {},
        create: {
            businessId: business.id,
            categoryId: toppingsCategory.id,
            name: "Each Taco",
            description: null,
            containsList: [],
            price: null,
            order: 1,
            isAvailable: true,
            slug: "each-taco",
            imageKey: "businesses/tacos-el-guero/menu-items/each-taco.webp",
            options: {
                create: [
                    {
                        name: "Sour Cream",
                        price: 0.25,
                        order: 1,
                        isAvailable: true,
                    },
                    {
                        name: "Cheese",
                        price: 0.25,
                        order: 2,
                        isAvailable: true,
                    },
                    {
                        name: "Avocado",
                        price: 0.25,
                        order: 3,
                        isAvailable: true,
                    },
                ],
            },
        }
    })

    await prisma.item.upsert({
        where: {
            businessId_slug: {
                businessId: business.id,
                slug: "tacos-regular",
            },
        },
        update: {},
        create: {
            businessId: business.id,
            categoryId: ordersCategory.id,
            name: "Tacos Regular",
            description: "3 tacos regulars with onion & cilantro",
            containsList: ["choice of meat", "onion", "cilantro"],
            price: null,
            order: 1,
            isAvailable: true,
            slug: "tacos-regular",
            imageKey: "businesses/tacos-el-guero/menu-items/tacos-regular.webp",
            options: {
                create: [
                    {
                        name: "Sausage",
                        price: 7.5,
                        order: 1,
                        isAvailable: true,
                    },
                    {
                        name: "Crispy Tripe",
                        price: 9,
                        order: 2,
                        isAvailable: true,
                    },
                    {
                        name: "No Meat",
                        price: 5.25,
                        order: 3,
                        isAvailable: true,
                    },
                ],
            },
        },
    });

    await prisma.item.upsert({
        where: {
            businessId_slug: {
                businessId: business.id,
                slug: "sour-cream-and-cheese-tacos",
            },
        },
        update: {},
        create: {
            businessId: business.id,
            categoryId: ordersCategory.id,
            name: "Sour Cream and Cheese Tacos",
            description: "3 tacos with sour cream, cheese, onion & cilantro",
            containsList: ["choice of meat", "onion", "cilantro", "cream", "cheese"],
            price: null,
            order: 2,
            isAvailable: true,
            slug: "sour-cream-and-cheese-tacos",
            imageKey: "businesses/tacos-el-guero/menu-items/sour-cream-and-cheese-tacos.webp",
            options: {
                create: [
                    {
                        name: "Sausage",
                        price: 9,
                        order: 1,
                        isAvailable: true,
                    },
                    {
                        name: "Crispy Tripe",
                        price: 11.25,
                        order: 2,
                        isAvailable: true,
                    },
                    {
                        name: "No Meat",
                        price: 6.75,
                        order: 3,
                        isAvailable: true,
                    },
                ],
            },
        },
    });

    await prisma.item.upsert({
        where: {
            businessId_slug: {
                businessId: business.id,
                slug: "can-coke",
            },
        },
        update: {},
        create: {
            businessId: business.id,
            categoryId: drinksCategory.id,
            name: "Can Coke",
            description: "Coca-Cola can, crispy refreshing original taste.",
            containsList: ["sugar", "caffeine", "carbonated water"],
            price: 2,
            order: 1,
            isAvailable: true,
            slug: "can-coke",
            imageKey: "businesses/tacos-el-guero/menu-items/can-coke.webp",
        },
    });

    // ########## End ##########

    console.log("Database seeded successfully.");
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => { await prisma.$disconnect() });