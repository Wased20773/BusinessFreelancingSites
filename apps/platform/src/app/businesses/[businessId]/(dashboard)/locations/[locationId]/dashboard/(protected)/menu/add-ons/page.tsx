"use client";

import "../../page.css";
import { cardMotion, fadeInMotion } from "@/components/motion/listMotion";
import AddOnGroupCard from "@/components/ui/addOns/AddOnGroupCard";
import IsSyncedCheckbox from "@/components/ui/IsSyncedCheckbox";
import PageHeading from "@/components/ui/PageHeader";
import PageState from "@/components/ui/PageState";
import RequiredField from "@/components/ui/RequiredField";
import { SkeletonRows } from "@/components/ui/Skeleton";
import {
  createAddOnGroup,
  getAddOnGroups,
  moveAddOnGroup,
} from "@/lib/api/addOns";
import { requestError } from "@/lib/api/requestError";
import { ACCESS_LEVEL, type AddOnGroupJson } from "@/types/types";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { type SubmitEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/*
 *   The location's add-ons, sorted into groups. Groups and add-ons are
 *   created and edited right on this page. Items pick from them in the
 *   item form. See docs/add-ons-plan.md.
 **/
export default function AddOnsPage() {
  const params = useParams<{ businessId: string; locationId: string }>();
  const { businessId, locationId } = params;
  const { data: session, status } = useSession();

  const [groups, setGroups] = useState<AddOnGroupJson[]>([]);
  // isFetching: the groups are loading (shows skeleton rows).
  // isLoading: a link was clicked and the next page is opening.
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [movingGroupId, setMovingGroupId] = useState<string | null>(null);

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSynced, setGroupSynced] = useState(false);

  const accessLevel = session?.user?.accessLevel;
  const canManage =
    accessLevel === ACCESS_LEVEL.owner || accessLevel === ACCESS_LEVEL.admin;
  const canView = canManage || accessLevel === ACCESS_LEVEL.staff;
  const isDeveloper = accessLevel === ACCESS_LEVEL.developer;

  const reload = useCallback(async () => {
    setGroups(await getAddOnGroups(businessId, locationId));
  }, [businessId, locationId]);

  useEffect(() => {
    async function load() {
      setIsFetching(true);
      setErrorMessage(null);

      try {
        await toast
          .promise(reload(), {
            loading: "Loading add-ons...",
            success: "Add-ons loaded.",
            error: requestError("Failed to load add-ons."),
          })
          .unwrap();
      } catch (error) {
        console.error("Error loading add-ons:", error);
        setErrorMessage("Failed to load add-ons.");
      } finally {
        setIsFetching(false);
      }
    }

    if (status === "authenticated" && canView) void load();
  }, [status, canView, reload]);

  async function handleCreateGroup(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupName.trim()) return;

    setIsSavingGroup(true);

    try {
      await toast
        .promise(
          createAddOnGroup(businessId, locationId, {
            name: groupName.trim(),
            isSynced: groupSynced,
          }),
          {
            loading: "Creating group...",
            success: "Group created.",
            error: requestError("Failed to create group."),
          },
        )
        .unwrap();

      await reload();
      setGroupName("");
      setGroupSynced(false);
      setIsCreatingGroup(false);
    } catch (error) {
      console.error("Error creating add-on group:", error);
    } finally {
      setIsSavingGroup(false);
    }
  }

  async function handleMoveGroup(groupId: string, direction: "up" | "down") {
    setMovingGroupId(groupId);

    try {
      await toast
        .promise(moveAddOnGroup(businessId, locationId, groupId, direction), {
          loading: direction === "up" ? "Moving group up" : "Moving group down",
          success: "Group order updated",
          error: requestError("Failed to move group."),
        })
        .unwrap();

      await reload();
    } catch (error) {
      console.error("Error moving add-on group:", error);
    } finally {
      setMovingGroupId(null);
    }
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView,
    pageTitle: "Add-ons",
    reason: "Your current access level does not include dashboard menu access.",
  });

  if (pageState) return pageState;

  return (
    <motion.section
      {...fadeInMotion}
      aria-labelledby="add-ons-heading"
      className="relative mx-auto max-w-[1000px]"
    >
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/menu`}
        ariaLabel="Return to menu"
        setIsLoading={setIsLoading}
        headingId="add-ons-heading"
        heading="Go Back"
      />

      <div className="mt-6 space-y-5 p-5 pt-0">
        <header>
          <h2 className="text-2xl font-semibold text-gray-900">Add-ons</h2>
          <p className="mt-1 text-sm text-gray-600">
            Extras that add to an item&apos;s price, such as toppings or sauces.
            Make them here, sorted into groups, then pick the ones each item
            offers in the item&apos;s form.
          </p>
        </header>

        {canManage && (
          <motion.div
            {...cardMotion(0)}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            {isCreatingGroup ? (
              <form onSubmit={handleCreateGroup}>
                <fieldset disabled={isSavingGroup} className="space-y-3">
                  <div>
                    <label
                      htmlFor="new-group-name"
                      className="text-sm font-medium text-gray-900"
                    >
                      Group name
                      <RequiredField />
                    </label>
                    <input
                      id="new-group-name"
                      type="text"
                      placeholder="Sauces"
                      value={groupName}
                      onChange={(event) => setGroupName(event.target.value)}
                      className="mt-1 block w-full min-w-0 rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2"
                      autoFocus
                    />
                  </div>

                  <IsSyncedCheckbox
                    hasSyncGroup={true}
                    htmlFor="new-group-sync"
                    inputName="new-group-sync"
                    isSynced={groupSynced}
                    setIsSynced={setGroupSynced}
                    isSaving={isSavingGroup}
                    description="All locations will get their own version of this group and will stay in sync between updates"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!groupName.trim()}
                      className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isSavingGroup ? "Creating..." : "Create group"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingGroup(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </fieldset>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreatingGroup(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-400 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100"
              >
                <Plus size={14} />
                Create group
              </button>
            )}
          </motion.div>
        )}

        {isFetching ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <SkeletonRows label="Loading add-ons" showReorder={canManage} />
          </div>
        ) : errorMessage ? (
          <p role="alert" className="text-red-700">
            {errorMessage}
          </p>
        ) : groups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
            {canManage
              ? "No add-on groups yet. Create a group, such as Sauces or Toppings, then add its add-ons."
              : "This location has no add-ons yet."}
          </p>
        ) : (
          groups.map((group, index) => (
            <motion.div key={group.id} layout="position" {...cardMotion(index + 1)}>
              <AddOnGroupCard
                businessId={businessId}
                locationId={locationId}
                group={group}
                canManage={canManage}
                isFirst={index === 0}
                isLast={index === groups.length - 1}
                isMoving={movingGroupId !== null}
                onMove={handleMoveGroup}
                onChanged={reload}
              />
            </motion.div>
          ))
        )}
      </div>
    </motion.section>
  );
}
