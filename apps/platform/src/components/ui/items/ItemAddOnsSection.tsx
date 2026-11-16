"use client";

import AddOnPicker from "@/components/ui/items/AddOnPicker";
import type { AddOnLinkDraft, OptionDraft } from "@/lib/items/optionDrafts";
import type { AddOnGroupJson } from "@/types/types";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";

type ItemAddOnsSectionProps = {
  groups: AddOnGroupJson[];
  groupsError: string | null;
  // The Add-ons page, to make some when there are none.
  addOnsHref: string;
  varyByOption: boolean;
  setVaryByOption: Dispatch<SetStateAction<boolean>>;
  itemAddOns: AddOnLinkDraft[];
  setItemAddOns: Dispatch<SetStateAction<AddOnLinkDraft[]>>;
  optionDrafts: OptionDraft[];
  canManage: boolean;
  disabled: boolean;
};

/*
 *   The item's add-ons. Off: one list for the whole item, picked here. On:
 *   each option picks its own, inside its card in Options. Both lists stay
 *   saved whichever is on. See docs/add-ons-plan.md.
 **/
export default function ItemAddOnsSection({
  groups,
  groupsError,
  addOnsHref,
  varyByOption,
  setVaryByOption,
  itemAddOns,
  setItemAddOns,
  optionDrafts,
  canManage,
  disabled,
}: ItemAddOnsSectionProps) {
  const hasOptions = optionDrafts.length > 0;
  const optionsHaveAddOns = optionDrafts.some((draft) => draft.addOns.length > 0);
  const hasAddOns = groups.some((group) => group.addOns.length > 0);

  return (
    <section aria-labelledby="item-add-ons-heading">
      <h2 id="item-add-ons-heading" className="text-base font-semibold text-gray-900">
        Add-ons
      </h2>

      <p className="mt-1 text-sm leading-6 text-gray-600">
        Extras that add to the price, such as toppings. A blank price uses the
        add-on&apos;s default.
      </p>

      {groupsError ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {groupsError}
        </p>
      ) : !hasAddOns ? (
        <p className="mt-3 text-sm text-gray-600">
          This location has no add-ons yet.{" "}
          {canManage && (
            <Link href={addOnsHref} className="font-medium text-blue-700 hover:underline">
              Create add-ons
            </Link>
          )}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {canManage && (
            <div>
              <label
                htmlFor="add-ons-vary-by-option"
                className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-gray-900"
              >
                <input
                  id="add-ons-vary-by-option"
                  type="checkbox"
                  className="size-4 accent-blue-600"
                  checked={varyByOption}
                  disabled={disabled || (!hasOptions && !varyByOption)}
                  onChange={(event) => setVaryByOption(event.target.checked)}
                />
                Add-on prices vary by option
              </label>

              {!hasOptions && !varyByOption && (
                <p className="mt-1 text-xs text-gray-600">
                  Add an option first to give each one its own add-ons.
                </p>
              )}

              {!varyByOption && optionsHaveAddOns && (
                <p className="mt-1 text-xs text-gray-600">
                  Add-on prices for each option are still saved. Turning this
                  on will use them again.
                </p>
              )}
            </div>
          )}

          {varyByOption ? (
            <p className="text-sm text-gray-600">
              {canManage
                ? "Pick each option's add-ons inside its card in Options above."
                : "This item's add-ons depend on the option; they're listed with each option above."}
            </p>
          ) : (
            <AddOnPicker
              idPrefix="item"
              groups={groups}
              value={itemAddOns}
              onChange={setItemAddOns}
              canManage={canManage}
              disabled={disabled}
            />
          )}
        </div>
      )}
    </section>
  );
}
