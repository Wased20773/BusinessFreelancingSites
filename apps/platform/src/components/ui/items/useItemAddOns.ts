"use client";

import { getAddOnGroups } from "@/lib/api/addOns";
import {
  draftsFromLinks,
  linksToPayload,
  type AddOnLinkDraft,
  type AddOnLinkPayload,
} from "@/lib/items/optionDrafts";
import type { AddOnGroupJson, ItemJson } from "@/types/types";
import { useEffect, useState } from "react";

/*
 *   The add-on state shared by the Create and Edit Item pages: the
 *   location's add-on groups (for the pickers), the "vary by option"
 *   setting, and the item's own picked add-ons. Each option's picks live
 *   on its option draft.
 **/
export function useItemAddOns(
  businessId: string,
  locationId: string,
  enabled: boolean,
) {
  const [groups, setGroups] = useState<AddOnGroupJson[]>([]);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [varyByOption, setVaryByOption] = useState(false);
  const [itemAddOns, setItemAddOns] = useState<AddOnLinkDraft[]>([]);

  useEffect(() => {
    if (!enabled) return;

    getAddOnGroups(businessId, locationId)
      .then((loaded) => {
        setGroups(loaded);
        setGroupsError(null);
      })
      .catch((error) => {
        console.error("Failed to load add-ons:", error);
        setGroupsError("Failed to load add-ons.");
      });
  }, [businessId, locationId, enabled]);

  // Shows a saved item's setting and its own add-ons.
  function showSaved(item: ItemJson) {
    setVaryByOption(item.addOnsVaryByOption);
    setItemAddOns(draftsFromLinks(item.addOns));
  }

  // The item-level fields for the request, or an error message.
  function toPayload():
    | { addOnsVaryByOption: boolean; addOns: AddOnLinkPayload[] }
    | { error: string } {
    const links = linksToPayload(itemAddOns, "Add-ons");

    if ("error" in links) return links;

    return { addOnsVaryByOption: varyByOption, addOns: links.links };
  }

  return {
    groups,
    groupsError,
    varyByOption,
    setVaryByOption,
    itemAddOns,
    setItemAddOns,
    showSaved,
    toPayload,
  };
}
