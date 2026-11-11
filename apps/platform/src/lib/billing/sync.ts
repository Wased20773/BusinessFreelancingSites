import { getBusinessPlan } from "./getBusinessPlan";

/*
 *   Sync is a paid feature. On a plan without it, a request's sync flag
 *   (isSynced / deleteAllSynced) is treated as false, so the write only
 *   affects the location being edited. Edited records keep their
 *   syncGroupId, so they can rejoin their group after upgrading.
 *
 *   Skips the plan lookup when sync wasn't requested.
 **/
export async function allowSync(
  businessId: string,
  requested: boolean,
): Promise<boolean> {
  if (!requested) return false;

  const { limits } = await getBusinessPlan(businessId);

  return limits.sync;
}
