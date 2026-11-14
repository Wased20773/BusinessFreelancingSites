import {
  buildSocialUrl,
  getPlatformFromDomain,
  normalizeProfileName,
  type SocialPlatform,
} from "@/data/socials";

describe("buildSocialUrl", () => {
  it.each<[SocialPlatform, string, string]>([
    ["instagram", "tacos.el_guero", "https://instagram.com/tacos.el_guero"],
    ["facebook", "tacoselguero", "https://facebook.com/tacoselguero"],
    ["youtube", "TacosElGuero", "https://youtube.com/@TacosElGuero"],
    ["tiktok", "tacos_el_guero", "https://tiktok.com/@tacos_el_guero"],
    ["x", "TacosElGuero", "https://x.com/TacosElGuero"],
  ])("builds the %s profile link", (platform, name, expected) => {
    expect(buildSocialUrl(platform, name)).toBe(expected);
  });
});

describe("normalizeProfileName", () => {
  it.each<[SocialPlatform, string, string]>([
    ["tiktok", "  @tacos_el_guero ", "tacos_el_guero"],
    ["instagram", "tacos.el_guero", "tacos.el_guero"],
    ["youtube", "@Tacos-El.Guero", "Tacos-El.Guero"],
  ])("accepts a valid %s name", (platform, input, expected) => {
    expect(normalizeProfileName(platform, input)).toEqual({
      profileName: expected,
    });
  });

  it.each<[SocialPlatform, unknown, string]>([
    ["instagram", "", "Enter your Instagram name."],
    ["instagram", undefined, "Enter your Instagram name."],
    ["instagram", "@", "Enter your Instagram name."],
    [
      "instagram",
      "https://instagram.com/tacos",
      "Type just your Instagram name, not the whole link.",
    ],
    [
      "tiktok",
      "www.tiktok.com",
      "Type just your TikTok name, not the whole link.",
    ],
    [
      "x",
      "tacos.guero",
      "X names can only use letters, numbers, and underscores.",
    ],
    [
      "facebook",
      "tacos_guero",
      "Facebook names can only use letters, numbers, and periods.",
    ],
    ["facebook", "taco", "Facebook names are 5 to 50 characters."],
    ["x", "a".repeat(16), "X names can be at most 15 characters."],
    ["instagram", "tacos el guero", "Instagram names can only use letters, numbers, periods, and underscores."],
  ])("rejects %s name %p", (platform, input, error) => {
    expect(normalizeProfileName(platform, input)).toEqual({ error });
  });
});

describe("getPlatformFromDomain", () => {
  it("finds a platform by its domain", () => {
    expect(getPlatformFromDomain("tiktok.com")).toBe("tiktok");
    expect(getPlatformFromDomain("twitter.com")).toBeNull();
  });
});
