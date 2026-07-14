import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });


// Create database client that talks to the Prisma Postgres database
const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
    }),
});

async function main() {
    // ################################
    // ##### Check For Email Argv #####
    // ################################
    console.log("\nChecking for email argv...")
    const email = process.argv[2];

    if (!email) {
        throw new Error(
            "[x] Missing email.\n\tUsage: npx tsx ./scripts/linkUser.ts your-email@gmail.com"
        );
    }
    console.log("\t[OK]");

    // ############################
    // ##### Check For Roles  #####
    // ############################
    console.log("\nChecking for admin role...")
    const adminRole = await prisma.role.findFirst({where: {accessLevel: "admin"}});
    if (!adminRole) {
        throw new Error(
            "[x] Admin role is missing, please run:\n\n\tnpx tsx .\\scripts\\role-seed.tsx"
        );
    }
    console.log("\t[OK] Admin role found");

    // ##############################
    // ##### Find User By Email #####
    // ##############################
    console.log("\nSearching you by email...")
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new Error(
            `[x] No user found for ${email}. Sign in with Google first, then run this seed again.`
        );
    }
    console.log(`\t[OK] ${user.email} found`)

    // #################################
    // ##### Find Business to Link #####
    // #################################
    console.log('\nFinding business "example"...')
    const business = await prisma.business.findUnique({
        where: { slug: "example" },
        select: { id: true, name: true },
    });

    if (!business) {
        throw new Error(
            "[x] The example business has not been created yet. Please run:\n\n\tnpx tsx .\\scripts\\demo_seed.ts"
        );
    }
    console.log(`\t[OK] ${business.name} found`)

    // #########################################
    // ##### Link the User to the Business #####
    // #########################################
    console.log(`\nLinking ${user.email} to ${business.name}`)
    await prisma.businessUser.upsert({
        where: {
            businessId_userId: {
                businessId: business.id,
                userId: user.id,
            },
        },
        update: {
            roleId: adminRole.id,
        },
        create: {
            businessId: business.id,
            userId: user.id,
            roleId: adminRole.id,
        },
    });

    console.log("User has been successfully linked to the business!");
    console.log(`${user.email} now has Admin role. You can now access admin level api routes.`);
}

main()
    .catch((error) => {
        console.error(`Seed failed:\n\t${error}`);
        process.exit(1);
    })
    .finally(async () => { await prisma.$disconnect() });