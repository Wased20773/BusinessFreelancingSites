/*
 *   One-off fix for socials saved before each platform had its own link rules.
 *   TikTok and YouTube links were missing the "@", some names were saved with a
 *   leading "@", and Twitter is now X. This rebuilds every social's domain, name,
 *   url, and icon from the platform list the app uses.
 *
 *   Run from packages/database:
 *       npx tsx scripts/fix-social-urls.ts           (dry run: only prints changes)
 *       npx tsx scripts/fix-social-urls.ts --apply   (saves the changes)
 *
 *   Socials it can't fix (an unsupported domain, or a name that breaks the
 *   platform's rules) are listed and left alone, so they can be fixed in the
 *   dashboard.
 **/
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  buildSocialUrl,
  getPlatformFromDomain,
  normalizeProfileName,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "../../../apps/platform/src/data/socials";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

const apply = process.argv.includes("--apply");

function platformFor(domain: string): SocialPlatform | null {
  if (domain === "twitter.com") return "x";

  return getPlatformFromDomain(domain);
}

async function main() {
  const socials = await prisma.social.findMany({
    select: {
      id: true,
      locationId: true,
      domain: true,
      profileName: true,
      url: true,
      icon: true,
    },
  });

  let changed = 0;
  let unchanged = 0;
  const skipped: string[] = [];

  for (const social of socials) {
    const label = `${social.id} (${social.domain} / ${social.profileName})`;
    const platform = platformFor(social.domain);

    if (!platform) {
      skipped.push(`${label}: unsupported domain`);
      continue;
    }

    let result = normalizeProfileName(platform, social.profileName);

    // The old server removed spaces when it built the link, so "Tacos El Guero"
    // already linked to /TacosElGuero. Keep pointing at that same name.
    if ("error" in result) {
      result = normalizeProfileName(
        platform,
        social.profileName.replace(/\s/g, ""),
      );
    }

    if ("error" in result) {
      skipped.push(`${label}: ${result.error}`);
      continue;
    }

    const data = {
      domain: SOCIAL_PLATFORMS[platform].domain,
      profileName: result.profileName,
      url: buildSocialUrl(platform, result.profileName),
      icon: SOCIAL_PLATFORMS[platform].icon,
    };

    if (
      data.domain === social.domain &&
      data.profileName === social.profileName &&
      data.url === social.url &&
      data.icon === social.icon
    ) {
      unchanged++;
      continue;
    }

    console.log(`[~] ${label}\n\t${social.url} -> ${data.url}`);

    if (data.profileName !== social.profileName) {
      console.log(
        `\tname "${social.profileName}" -> "${data.profileName}" (check this is the real account)`,
      );
    }

    if (apply) {
      try {
        await prisma.social.update({ where: { id: social.id }, data });
      } catch (error) {
        // Another social in the location already has the fixed name.
        skipped.push(`${label}: could not save (${(error as Error).message})`);
        continue;
      }
    }

    changed++;
  }

  console.log(
    `\n${apply ? "Updated" : "Would update"} ${changed}, already correct ${unchanged}, skipped ${skipped.length}.`,
  );

  for (const reason of skipped) console.log(`[x] ${reason}`);

  if (!apply && changed > 0) {
    console.log("\nDry run only. Run again with --apply to save these changes.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
