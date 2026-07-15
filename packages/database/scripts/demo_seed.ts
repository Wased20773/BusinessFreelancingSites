import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DayOfWeek } from "@business-freelancer/database";
import { createBusinessUser, createHoursForDays, createLocationDay, createSlug, createSocial, createUser, seedCategory, seedDrinks, seedItemWithOptions } from "./seed_helper";
import { breakfastHours, normalDayHours, specialDayHours } from "../dummy_data/hours"
import { meatsNoCheese, tacoToppings, BQNToppings, cans, bottles , aguaFrescas } from "../dummy_data/items"

// Create database client that talks to the Prisma Postgres database
const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
    }),
});

async function main() {
    // ###########################
    // ##### Check For Roles #####
    // ###########################
    console.log("\nChecking for roles...")

    const ownerRole = await prisma.role.findFirst({where: {accessLevel:"owner"}});
    if (!ownerRole) console.warn("\t*** owner role missing ***");
    
    const adminRole = await prisma.role.findFirst({where: {accessLevel:"admin"}});
    if (!adminRole) console.warn("\t*** admin role missing ***");
    
    const staffRole = await prisma.role.findFirst({where: {accessLevel:"staff"}});
    if (!staffRole) console.warn("\t*** staff role missing ***");
    
    if (!ownerRole || !adminRole || !staffRole) {
        throw new Error(
            "[x] One or more roles are missing, please seed roles before running this seed"
        );
    }

    // ###########################
    // ##### Create Business #####
    // ###########################
    console.log("\nCreating business...");

    let business = undefined
    const businessExists = await prisma.business.findUnique({
        where: { slug: "example" },
        select: { id: true },
    });
    
    if (businessExists) {
        business = businessExists;
        console.log("\t[=] Business already existed");
    } else {
        business = await prisma.business.upsert({
            where: { slug: "example" },
            update: {},
            create: {
                name: "Example Restaurant",
                slug: "example",
                domain: "example",
            },
        });

        if (business) console.log(`\t[+] Business "${business.name}" created`);
        else {
            throw new Error(
                "[x] Unsuccessful creation of business, please check your connection string and try again"
            );
        }
    }
    
    // #############################
    // ##### Find/Create Users #####
    // #############################
    console.log("\nCreating users...");

    const ownerUser = await createUser({
        prisma,
        name: "Owner",
        username: "Owner",
        email: "owner@example.com"
    });

    const adminUser = await createUser({
        prisma,
        name: "Admin",
        username: "Administrator",
        email: "admin@example.com"
    });

    const staffUser_One = await createUser({
        prisma,
        name: "Alex",
        email: "alex@example.com"
    });

    const staffUser_Two = await createUser({
        prisma,
        name: "John",
        email: "john@example.com"
    });

    const staffUser_Three = await createUser({
        prisma,
        name: "Mark",
        email: "mark@example.com"
    });

    const staffUsers = [staffUser_One, staffUser_Two, staffUser_Three];

    // ##################################################
    // ##### Create the Join Table For BusinessUser #####
    // ##################################################
    console.log("\nCreating join table for businessUser...");

    // Linking owner
    await prisma.businessUser.upsert({
        where: {
            businessId_userId: {
                businessId: business.id,
                userId: ownerUser.id,
            },
        },
        update: {},
        create: {
            businessId: business.id,
            userId: ownerUser.id,
            roleId: ownerRole.id,
        },
    });

    // Linking owner
    await createBusinessUser({
        prisma,
        businessId: business.id,
        user: ownerUser,
        roleId: ownerRole.id,
    });

    // Linking admins
    await createBusinessUser({
        prisma,
        businessId: business.id,
        user: adminUser,
        roleId: adminRole.id,
    });

    // Linking all staff members
    for (const staffUser of staffUsers) {
        await createBusinessUser({
            prisma,
            businessId: business.id,
            user: staffUser,
            roleId: staffRole.id,
        });
    }

    // ##########################
    // ##### Create Contact #####
    // ##########################
    console.log("\nCreating contact...");

    let contact = await prisma.contact.findFirst({
        where: { businessId: business.id },
    });

    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                businessId: business.id,
                phoneNumber: "503-000-0000",
                email: "contact@example.com",
                isPersonal: false,
            },
        });
        console.log(`\t[+] Contact for ${contact.email} created`);
    } else {
        console.log(`\t[=] ${contact.email} already exist`);
    }

    // #######################
    // ##### Add Socials #####
    // #######################
    console.log("\nCreating socials...");

    await createSocial({
        prisma,
        businessId: business.id,
        domain: "instagram.com",
        profileName: createSlug("example resturant"),
        url: `instagram.com/${createSlug("example resturant")}`,
        icon: "businesses/icons/socials/instagram.webp",
    });

    await createSocial({
        prisma,
        businessId: business.id,
        domain: "facebook.com",
        profileName: createSlug("example resturant"),
        url: `facebook.com/${createSlug("example resturant")}`,
        icon: "businesses/icons/socials/facebook.webp",
    });

    // #########################
    // ##### Add Locations #####
    // #########################
    console.log("\nCreating Location...");

    let location = await prisma.location.findFirst({
        where: { businessId: business.id },
    });

    if (!location) {
        location = await prisma.location.create({
            data: {
                businessId: business.id,
                address: "Example St. 12345",
                zip: "12345",
            },
        });
        console.log(`\t[+] ${location.address} has been added`);
    } else {
        console.log(`\t[=] ${location.address} already exist`);
    }

    // ############################
    // ##### Add Working Days #####
    // ############################
    console.log("\nCreating working days for the location...");
    
    type LocationDay = {
        dayOfWeek: DayOfWeek,
        isClosed?: boolean,
    };

    const locationDays: LocationDay[] = [
        {
            dayOfWeek: DayOfWeek.Sunday,
            isClosed: true,
        },
        {
            dayOfWeek: DayOfWeek.Monday,
        },
        {
            dayOfWeek: DayOfWeek.Tuesday,
        },
        {
            dayOfWeek: DayOfWeek.Wednesday,
        },
        {
            dayOfWeek: DayOfWeek.Thursday,
        },
        {
            dayOfWeek: DayOfWeek.Friday,
        },
        {
            dayOfWeek: DayOfWeek.Saturday,
            isClosed: true,
        },
    ];

    const createdLocationDays = await Promise.all(
        locationDays.map((day) =>
            createLocationDay({
                prisma,
                locationId: location.id,
                dayOfWeek: day.dayOfWeek,
                isClosed: day.isClosed,
            })
        )
    );

    const daysByName = Object.fromEntries(
        createdLocationDays.map((day) => [day.dayOfWeek, day])
    ) as Record<DayOfWeek, (typeof createdLocationDays)[number]>;

    const sunday = daysByName[DayOfWeek.Sunday];
    const monday = daysByName[DayOfWeek.Monday];
    const tuesday = daysByName[DayOfWeek.Tuesday];
    const wednesday = daysByName[DayOfWeek.Wednesday];
    const thursday = daysByName[DayOfWeek.Thursday];
    const friday = daysByName[DayOfWeek.Friday];
    const saturday = daysByName[DayOfWeek.Saturday];

    const workingDays = [monday, tuesday, wednesday, thursday, friday];
    const normalDays = [tuesday, wednesday, thursday];
    const specialDays = [monday, friday];

    // #############################
    // ##### Add Working Hours #####
    // #############################
    console.log("\nCreating working hours for the days...");

    await createHoursForDays({
        prisma,
        days: workingDays,
        hours: breakfastHours,
    });

    await createHoursForDays({
        prisma,
        days: normalDays,
        hours: normalDayHours,
    });

    await createHoursForDays({
        prisma,
        days: specialDays,
        hours: specialDayHours,
    });

    // #############################
    // ##### Create Categories #####
    // #############################
    console.log("\nCreating categories...");

    const tacosWithOnionAndCilantroCategory = await seedCategory({
        prisma,
        businessId: business.id,
        name: "Tacos with onion and cilantro",
        order: 1
    });

    const toppingsCategory = await seedCategory({
        prisma,
        businessId: business.id,
        name: "Toppings",
        description: "For each taco, Burrito, Quesadilla, or Nachos you must pay per added topping.",
        order: 2
    });

    const drinksCategory = await seedCategory({
        prisma,
        businessId: business.id,
        name: "Drinks",
        description: "Cans (12oz), Bottles/water, and Traditional Mexican Drinks.",
        order: 3
    });

    const cansSubCategory = await seedCategory({
        prisma,
        businessId: business.id,
        parentId: drinksCategory.id,
        name: "Cans (12oz)",
        order: 1
    });

    const bottlesSubCategory = await seedCategory({
        prisma,
        businessId: business.id,
        parentId: drinksCategory.id,
        name: "Bottles",
        order: 2
    });

    const TraditionalSubCategory = await seedCategory({
        prisma,
        businessId: business.id,
        parentId: drinksCategory.id,
        name: "Traditional Mexican Drinks",
        order: 3
    });

    const ordersCategory = await seedCategory({
        prisma,
        businessId: business.id,
        name: "Orders",
        order: 4
    });

    // ###########################################
    // ##### Add Menu Items to Each Category #####
    // ###########################################
    console.log("\nCreating items for each category...");

    // Category: Tacos with onion and cilantro
    // Purpose: Create item with all its options
    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: tacosWithOnionAndCilantroCategory.id,
        name: "Meat",
        order: 1,
        options: meatsNoCheese.map(({ meat, price }) => ({
                name: meat,
                price: price
            })),
    });

    // Category: Toppings
    // Purpose: Create toppings for both tacos and other item types
    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: toppingsCategory.id,
        name: "Each Taco",
        price: 0,
        order: 1,
        options: tacoToppings.map(({ topping, price }) => ({
                name: topping,
                price: price
            })),
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: toppingsCategory.id,
        name: "Burrito, Quesadilla, Nachos",
        price: 0,
        order: 2,
        options: BQNToppings.map(({ topping, price }) => ({
                name: topping,
                price: price
            })),
    });

    // Category: Drinks -> SubCategory to Cans, Bottles, and Traditional Mexican Drinks
    // Purpose: Create all the drink items, (cans, bottles, and traditional mexican drinks)
    await seedDrinks({
        prisma,
        businessId: business.id,
        categoryId: cansSubCategory.id,
        drinks: cans
    });
    
    await seedDrinks({
        prisma,
        businessId: business.id,
        categoryId: bottlesSubCategory.id,
        drinks: bottles
    });

    await seedDrinks({
        prisma,
        businessId: business.id,
        categoryId: TraditionalSubCategory.id,
        drinks: aguaFrescas
    });

    // Category: Orders
    // Purpose: Create all items inside the Orders category
    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#1 Tacos",
        description: "3 tacos regulares with onion & cilantro",
        price: 0.00,
        order: 1,
        options: [
            { name: "Sausage", price: 7.50 },
            { name: "Asada", price: 7.50 },
            { name: "Chicken", price: 7.50 },
            { name: "Pastor", price: 7.50 },
            { name: "Tripe", price: 7.50 },
            { name: "Crispy Tripe", price: 9.00 },
            { name: "Buche (Pork Stomach)", price: 8.25 },
            { name: "No Meat", price: 5.25 }
        ]
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#2 Tacos",
        description: "3 tacos with sour cream, cheese, onion, & cilantro",
        price: 0.00,
        order: 2,
        options: [
            { name: "Sausage", price: 9.00 },
            { name: "Asada", price: 9.00 },
            { name: "Chicken", price: 9.00 },
            { name: "Pastor", price: 9.00 },
            { name: "Tripe", price: 9.00 },
            { name: "Crispy Tripe", price: 11.25 },
            { name: "Buche (Pork Stomach)", price: 9.75 },
            { name: "No Meat", price: 6.75 }
        ]
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#3 Nachos",
        description: "Contains tortialla chip, beans, onion, cilantro, sour cream, cheese, and choice of meat",
        price: 0.00,
        order: 3,
        options: [
            { name: "Sausage", price: 13.00 },
            { name: "Asada", price: 13.00 },
            { name: "Chicken", price: 13.00 },
            { name: "Pastor", price: 13.00 },
            { name: "Tripe", price: 13.00 },
            { name: "Crispy Tripe", price: 14.50 },
            { name: "Buche (Pork Stomach)", price: 13.75 },
            { name: "No Meat", price: 8.00 }
        ]
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#4 Quesadilla",
        description: "Contains cheese, onion, cilantro, and choice of meat",
        price: 0.00,
        order: 4,
        options: [
            { name: "Sausage", price: 13.00 },
            { name: "Asada", price: 13.00 },
            { name: "Chicken", price: 13.00 },
            { name: "Pastor", price: 13.00 },
            { name: "Tripe", price: 13.00 },
            { name: "Crispy Tripe", price: 14.50 },
            { name: "Buche (Pork Stomach)", price: 14.00 },
            { name: "No Meat", price: 8.00 }
        ]
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#5 Quesadilla",
        description: "Contains cheese, onion, cilantro, choice of meat, and rice & beans on the side",
        price: 0.00,
        order: 5,
        options: [
            { name: "Sausage", price: 16.50 },
            { name: "Asada", price: 16.50 },
            { name: "Chicken", price: 16.50 },
            { name: "Pastor", price: 16.50 },
            { name: "Tripe", price: 16.50 },
            { name: "Crispy Tripe", price: 18.00 },
            { name: "Buche (Pork Stomach)", price: 17.25 },
            { name: "No Meat", price: 11.00 }
        ]
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#6 Torta",
        description: "Contains mayonnaise, beans, cheese, onino, cilantro, tomato, avocado, lettuce, and choice of meat",
        price: 0.00,
        order: 6,
        options: [
            { name: "Sausage", price: 13.00 },
            { name: "Asada", price: 13.00 },
            { name: "Chicken", price: 13.00 },
            { name: "Pastor", price: 13.00 },
            { name: "Tripe", price: 13.00 },
            { name: "Crispy Tripe", price: 14.50 },
            { name: "Buche (Pork Stomach)", price: 14.00 },
            { name: "No Meat", price: 8.00 }
        ]
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#7 Lunch Special",
        description: "Our lunch special contains 3 regular tacos, rice & beans, and a can of soda",
        price: 0.00,
        order: 7,
        options: [
            { name: "Sausage", price: 13.00 },
            { name: "Asada", price: 13.00 },
            { name: "Chicken", price: 13.00 },
            { name: "Pastor", price: 13.00 },
            { name: "Tripe", price: 13.00 },
            { name: "Crispy Tripe", price: 14.50 },
            { name: "Buche (Pork Stomach)", price: 13.75 },
            { name: "No Meat", price: 9.50 }
        ]
    });

    
    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#8 Burrito",
        description: "Burritos come with rice & beans, onion, cilantro, sour cream & cheese, and choice of meat",
        price: 0.00,
        order: 8,
        options: [
            { name: "Sausage", price: 10.00 },
            { name: "Asada", price: 10.00 },
            { name: "Chicken", price: 10.00 },
            { name: "Pastor", price: 10.00 },
            { name: "Tripe", price: 10.00 },
            { name: "Crispy Tripe", price: 11.50 },
            { name: "Buche (Pork Stomach)", price: 10.75 },
            { name: "No Meat", price: 7.00 },
            { name: "Cheese & Beans Burrito", price: 5.50 }
        ]
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#9 Wet Burrito",
        description: "Regular burrito topped with tomatillo sauce, sour cream & cheese",
        price: 0.00,
        order: 9,
        options: [
            { name: "Sausage", price: 13.00 },
            { name: "Asada", price: 13.00 },
            { name: "Chicken", price: 13.00 },
            { name: "Pastor", price: 13.00 },
            { name: "Tripe", price: 13.00 },
            { name: "Crispy Tripe", price: 14.50 },
            { name: "Buche (Pork Stomach)", price: 14.00 },
            { name: "No Meat", price: 9.00 }
        ]
    });
    
    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#10 Sopes",
        description: "With beans, cheese, sour cream, lettuce, onion, cilantro, and choice of meat",
        price: 0.00,
        order: 10,
        options: [
            { name: "Sausage", price: 13.00 },
            { name: "Asada", price: 13.00 },
            { name: "Chicken", price: 13.00 },
            { name: "Pastor", price: 13.00 },
            { name: "Tripe", price: 13.00 },
            { name: "Crispy Tripe", price: 14.50 },
            { name: "Buche (Pork Stomach)", price: 14.00 },
            { name: "No Meat", price: 9.00 }
        ]
    });

    await seedItemWithOptions({
        prisma,
        businessId: business.id,
        categoryId: ordersCategory.id,
        name: "#11 Chavindeca",
        description: "With beans, cheese, sour cream, lettuce, onion, cilantro, and choice of meat",
        price: 0.00,
        order: 11,
        options: [
            { name: "Sausage", price: 13.00 },
            { name: "Asada", price: 13.00 },
            { name: "Chicken", price: 13.00 },
            { name: "Pastor", price: 13.00 },
            { name: "Tripe", price: 13.00 },
            { name: "Crispy Tripe", price: 14.50 },
            { name: "Buche (Pork Stomach)", price: 14.00 },
            { name: "No Meat", price: 9.00 }
        ]
    });

    console.log("\n##################################################");
    console.log("### Demo business seed successfully completed! ###");
    console.log("##################################################");
    console.log("\nTo begin, run the platform app through the root folder and run:");
    console.log("\n\tnpm run dev:platform");
    console.log('\nOnce you enter make sure to make a note of the email used to login, you will need that same email for linking your account with the business.');
    console.log('Make sure to run this command after logging in:\n\n\tnpx tsx .\\scripts\\linkUser-seed.ts your-email@address.com');
}

main()
    .catch((error) => {
        console.error(`Seed failed:\n\t${error}`);
        process.exit(1);
    })
    .finally(async () => { await prisma.$disconnect() });