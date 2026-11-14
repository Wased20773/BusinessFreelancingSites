/*
 *   The social platforms a location can link to. The server picks the domain, icon,
 *   and URL from this list, so a user can only ever choose a platform and type their
 *   name. It never accepts a domain or a link from the request.
 *
 *   Each platform has its own profile link shape (TikTok and YouTube put an "@" in
 *   front of the name) and its own rules for which names are allowed.
 **/
type SocialPlatformConfig = {
  label: string;
  domain: string;
  icon: string;
  // Shown in front of the input so the user only types the name.
  urlPrefix: string;
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  allowedCharacters: string;
  placeholder: string;
  // Extra help shown under the input, for platforms with a catch.
  hint?: string;
};

export const SOCIAL_PLATFORMS = {
  instagram: {
    label: "Instagram",
    domain: "instagram.com",
    icon: "social-icons/instagram/normal.svg",
    urlPrefix: "instagram.com/",
    minLength: 1,
    maxLength: 30,
    pattern: /^[A-Za-z0-9._]+$/,
    allowedCharacters: "letters, numbers, periods, and underscores",
    placeholder: "yourbusiness",
  },
  facebook: {
    label: "Facebook",
    domain: "facebook.com",
    icon: "social-icons/facebook/normal.svg",
    urlPrefix: "facebook.com/",
    minLength: 5,
    maxLength: 50,
    pattern: /^[A-Za-z0-9.]+$/,
    allowedCharacters: "letters, numbers, and periods",
    placeholder: "yourbusiness",
    hint: "Your page needs a Facebook username. If your page's link looks like facebook.com/profile.php?id=123…, it doesn't have one yet. Create a username for your page in Facebook first, then add it here.",
  },
  youtube: {
    label: "YouTube",
    domain: "youtube.com",
    icon: "social-icons/youtube/normal.svg",
    urlPrefix: "youtube.com/@",
    minLength: 3,
    maxLength: 30,
    pattern: /^[A-Za-z0-9._-]+$/,
    allowedCharacters: "letters, numbers, periods, underscores, and hyphens",
    placeholder: "yourbusiness",
  },
  tiktok: {
    label: "TikTok",
    domain: "tiktok.com",
    icon: "social-icons/tiktok/normal.svg",
    urlPrefix: "tiktok.com/@",
    minLength: 2,
    maxLength: 24,
    pattern: /^[A-Za-z0-9._]+$/,
    allowedCharacters: "letters, numbers, periods, and underscores",
    placeholder: "yourbusiness",
  },
  x: {
    label: "X",
    domain: "x.com",
    icon: "social-icons/x/normal.svg",
    urlPrefix: "x.com/",
    minLength: 1,
    maxLength: 15,
    pattern: /^[A-Za-z0-9_]+$/,
    allowedCharacters: "letters, numbers, and underscores",
    placeholder: "yourbusiness",
  },
} as const satisfies Record<string, SocialPlatformConfig>;

export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

export const SOCIAL_PLATFORM_KEYS = Object.keys(
  SOCIAL_PLATFORMS,
) as SocialPlatform[];

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(SOCIAL_PLATFORMS, value)
  );
}

export function getPlatformFromDomain(domain: string): SocialPlatform | null {
  return (
    SOCIAL_PLATFORM_KEYS.find(
      (platform) => SOCIAL_PLATFORMS[platform].domain === domain,
    ) ?? null
  );
}

/*
 *   Checks a typed profile name for a platform. A leading "@" is dropped because
 *   people often type it. A pasted link is rejected: we only take the name.
 **/
export function normalizeProfileName(
  platform: SocialPlatform,
  value: unknown,
): { profileName: string } | { error: string } {
  const config = SOCIAL_PLATFORMS[platform];
  const name = typeof value === "string" ? value.trim().replace(/^@/, "") : "";

  if (!name) {
    return { error: `Enter your ${config.label} name.` };
  }

  if (/[/:]/.test(name) || /^www\./i.test(name)) {
    return {
      error: `Type just your ${config.label} name, not the whole link.`,
    };
  }

  if (!config.pattern.test(name)) {
    return {
      error: `${config.label} names can only use ${config.allowedCharacters}.`,
    };
  }

  if (name.length < config.minLength || name.length > config.maxLength) {
    return {
      error:
        config.minLength === 1
          ? `${config.label} names can be at most ${config.maxLength} characters.`
          : `${config.label} names are ${config.minLength} to ${config.maxLength} characters.`,
    };
  }

  return { profileName: name };
}

// Builds the profile link from a name that already passed normalizeProfileName.
export function buildSocialUrl(
  platform: SocialPlatform,
  profileName: string,
): string {
  return `https://${SOCIAL_PLATFORMS[platform].urlPrefix}${profileName}`;
}
