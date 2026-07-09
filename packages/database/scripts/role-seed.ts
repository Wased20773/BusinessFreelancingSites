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
    let staffRole = await prisma.role.findFirst({
        where: { accessLevel: "staff"}
    })

    if (!ownerRole) {
        ownerRole = await prisma.role.create({
            data: {
                accessLevel: "owner",
                description: "Full business-level access. Can add, update, and change business content, manage users/roles, and transfer ownership.",
            },
        });
        console.log("[+] Inserted owner role");
    }


    if (!adminRole) {
        adminRole = await prisma.role.create({
            data: {
                accessLevel: "admin",
                description: "Can add, update, and delete business content. Can manage general user information, but cannot remove an owner, or transfer ownership."
            }
        });
        console.log("[+] Inserted admin role");
    }

    if (!staffRole) {
        staffRole = await prisma.role.create({
            data: {
                accessLevel: "staff",
                description: "View-only access. Can view business information but cannot add, update, or delete business content. Free to update their credentials but not role."
            }
        });
        console.log("[+] Inserted staff role");
    }
    
    // ########## End ##########

    console.log("Role's seeded successfully.");
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => { await prisma.$disconnect() });