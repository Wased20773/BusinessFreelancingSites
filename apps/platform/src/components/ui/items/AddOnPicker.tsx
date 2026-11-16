"use client";

import ChevronIcon from "@/components/icons/chevron";
import type { AddOnLinkDraft } from "@/lib/items/optionDrafts";
import type { AddOnGroupJson } from "@/types/types";
import { useState } from "react";

type AddOnPickerProps = {
  // Unique per picker (the item's, or one option's), for input ids.
  idPrefix: string;
  groups: AddOnGroupJson[];
  value: AddOnLinkDraft[];
  onChange: (next: AddOnLinkDraft[]) => void;
  canManage: boolean;
  disabled: boolean;
};

// A fixed height (the same as a row), so the border is drawn inside it and
// can't make the row taller.
const priceInputClass =
  "block h-8 w-20 min-w-0 rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-2 py-0 text-sm disabled:opacity-50";

/*
 *   Picks which add-ons an item (or one option) offers, group by group.
 *   Each picked add-on has a price box: empty uses the add-on's default.
 *
 *   Sold-out add-ons aren't shown, but stay picked: saving keeps their
 *   links, so they come back when they're available again.
 *
 *   The inputs have no `name`, so they don't mix with the item form's fields.
 **/
export default function AddOnPicker({
  idPrefix,
  groups,
  value,
  onChange,
  canManage,
  disabled,
}: AddOnPickerProps) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      addOns: group.addOns.filter((addOn) => addOn.isAvailable),
    }))
    .filter((group) => group.addOns.length > 0);

  const picked = new Map(value.map((link) => [link.addOnId, link]));

  // Groups start open when something in them is picked.
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () =>
      new Set(
        visibleGroups
          .filter((group) => group.addOns.some((addOn) => picked.has(addOn.id)))
          .map((group) => group.id),
      ),
  );

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => {
      const next = new Set(current);

      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);

      return next;
    });
  }

  function toggleAddOn(addOnId: string, checked: boolean) {
    onChange(
      checked
        ? [...value, { addOnId, price: "" }]
        : value.filter((link) => link.addOnId !== addOnId),
    );
  }

  function setPrice(addOnId: string, price: string) {
    onChange(
      value.map((link) =>
        link.addOnId === addOnId ? { ...link, price } : link,
      ),
    );
  }

  function selectAll(addOnIds: string[]) {
    onChange([
      ...value,
      ...addOnIds
        .filter((addOnId) => !picked.has(addOnId))
        .map((addOnId) => ({ addOnId, price: "" })),
    ]);
  }

  // Clears what's shown. Sold-out picks stay, like everywhere else here.
  const visibleIds = new Set(
    visibleGroups.flatMap((group) => group.addOns.map((addOn) => addOn.id)),
  );
  const visiblePickedCount = value.filter((link) =>
    visibleIds.has(link.addOnId),
  ).length;

  function clearAll() {
    onChange(value.filter((link) => !visibleIds.has(link.addOnId)));
  }

  if (visibleGroups.length === 0) {
    return (
      <p className="text-sm text-gray-600">No add-ons to pick from yet.</p>
    );
  }

  // Read-only: just what's picked, with the price this item charges.
  if (!canManage) {
    const pickedGroups = visibleGroups
      .map((group) => ({
        ...group,
        addOns: group.addOns.filter((addOn) => picked.has(addOn.id)),
      }))
      .filter((group) => group.addOns.length > 0);

    if (pickedGroups.length === 0) {
      return <p className="text-sm text-gray-600">No add-ons.</p>;
    }

    return (
      <div className="space-y-3">
        {pickedGroups.map((group) => (
          <div key={group.id}>
            <p className="text-sm font-semibold text-gray-900">{group.name}</p>
            <ul className="mt-1 space-y-1">
              {group.addOns.map((addOn) => {
                const ownPrice = picked.get(addOn.id)?.price;

                return (
                  <li
                    key={addOn.id}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-gray-700">{addOn.name}</span>
                    <span className="whitespace-nowrap text-gray-900">
                      +${Number(ownPrice || addOn.price).toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{visiblePickedCount} picked</p>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled || visiblePickedCount === 0}
          className="text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
        >
          Clear all
        </button>
      </div>

      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
        {visibleGroups.map((group) => {
          const isOpen = openGroups.has(group.id);
          const panelId = `${idPrefix}-group-${group.id}`;
          const pickedCount = group.addOns.filter((addOn) =>
            picked.has(addOn.id),
          ).length;

          return (
            <div key={group.id}>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleGroup(group.id)}
                  className="flex min-w-0 items-center gap-2 text-left"
                >
                  <span
                    className={`shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  >
                    <ChevronIcon direction="down" size={16} />
                  </span>
                  <span className="truncate font-medium text-gray-900">
                    {group.name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-600">
                    {pickedCount}/{group.addOns.length}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={disabled || pickedCount === group.addOns.length}
                  onClick={() => {
                    selectAll(group.addOns.map((addOn) => addOn.id));
                    setOpenGroups((current) => new Set(current).add(group.id));
                  }}
                  className="shrink-0 text-sm font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                >
                  Select all
                </button>
              </div>

              {isOpen && (
                <ul id={panelId} className="space-y-2 px-3 pb-3">
                  {group.addOns.map((addOn) => {
                    const link = picked.get(addOn.id);
                    const checkboxId = `${idPrefix}-add-on-${addOn.id}`;

                    return (
                      <li
                        key={addOn.id}
                        // Same height and no wrapping whether it's picked or
                        // not, so checking a box never moves the rows below.
                        className="flex h-8 items-center justify-between gap-3"
                      >
                        <label
                          htmlFor={checkboxId}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-gray-900"
                        >
                          <input
                            id={checkboxId}
                            type="checkbox"
                            className="size-4 shrink-0 accent-blue-600"
                            checked={Boolean(link)}
                            disabled={disabled}
                            onChange={(event) =>
                              toggleAddOn(addOn.id, event.target.checked)
                            }
                          />
                          <span className="truncate">{addOn.name}</span>
                        </label>

                        {link ? (
                          <span className="flex w-28 shrink-0 items-center justify-end gap-1 text-sm text-gray-600">
                            <label htmlFor={`${checkboxId}-price`}>+$</label>
                            <input
                              id={`${checkboxId}-price`}
                              type="number"
                              min="0"
                              step="0.01"
                              className={priceInputClass}
                              // The default shows greyed out; type to set this item's own price.
                              placeholder={Number(addOn.price).toFixed(2)}
                              value={link.price}
                              disabled={disabled}
                              onChange={(event) =>
                                setPrice(addOn.id, event.target.value)
                              }
                            />
                          </span>
                        ) : (
                          <span className="w-28 shrink-0 text-right text-sm text-gray-500">
                            +${Number(addOn.price).toFixed(2)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
