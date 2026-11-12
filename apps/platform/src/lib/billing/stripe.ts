import Stripe from "stripe";
import type { PlanTier } from "@business-freelancer/database/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing. Add it to apps/platform/.env.local.`);
  }

  return value;
}

/*
 *   Server-only Stripe client, created on first use.
 *
 *   Created lazily (not when this file is imported) so tests and `next build`
 *   in CI don't need Stripe keys. Pinned to the API version this SDK's types
 *   describe, so the types always match what Stripe sends.
 **/
let client: Stripe | null = null;

export function getStripe(): Stripe {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-10-28.endive",
  });

  return client;
}

/*
 *   Base URL Stripe sends people back to after Checkout or the Portal.
 **/
export function getAppUrl(): string {
  return requireEnv("APP_URL").replace(/\/$/, "");
}

/*
 *   Which env var holds each tier's Stripe price ID.
 *
 *   Typed as Record<PlanTier, ...>, so adding a tier to the PlanTier enum
 *   is a type error here until it gets a Stripe price.
 **/
const PRICE_ENV: Record<PlanTier, string> = {
  familyBusiness: "STRIPE_PRICE_FAMILY_BUSINESS",
  localBusiness: "STRIPE_PRICE_LOCAL_BUSINESS",
  growingBusiness: "STRIPE_PRICE_GROWING_BUSINESS",
};

export function getPriceIdForTier(tier: PlanTier): string {
  return requireEnv(PRICE_ENV[tier]);
}

/*
 *   The reverse lookup, for webhooks: Stripe tells us the price,
 *   we need the tier. Returns null for a price that isn't one of ours.
 **/
export function getTierForPriceId(priceId: string): PlanTier | null {
  for (const tier of Object.keys(PRICE_ENV) as PlanTier[]) {
    if (process.env[PRICE_ENV[tier]] === priceId) {
      return tier;
    }
  }

  return null;
}

/*
 *   Returns the user's Stripe customer ID, creating the customer the first
 *   time this user pays. A customer belongs to the person (their card),
 *   not the business, so one user paying for several businesses has one
 *   customer with one subscription per business.
 *
 *   The idempotency key makes a double click (two requests at once) return
 *   the same Stripe customer instead of creating two.
 **/
export async function getOrCreateStripeCustomer(
  userId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, name: true },
  });

  if (!user) {
    throw new Error(`User ${userId} was not found`);
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await getStripe().customers.create(
    {
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId },
    },
    { idempotencyKey: `customer-for-user-${userId}` },
  );

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
