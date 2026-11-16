"use client";

import IsSyncedCheckbox from "@/components/ui/IsSyncedCheckbox";
import RequiredField from "@/components/ui/RequiredField";
import type { AddOnFormBody } from "@/lib/api/addOns";
import type { AddOnJson } from "@/types/types";
import { motion } from "motion/react";
import { type SubmitEvent, useState } from "react";

type AddOnFormProps = {
  // The add-on being edited; left out when creating one.
  addOn?: AddOnJson;
  // The group is synced, so the add-on can be synced too.
  groupIsSynced: boolean;
  isSaving: boolean;
  onSave: (data: AddOnFormBody) => Promise<void>;
  onCancel: () => void;
  // Edit only: opens the delete warning.
  onDelete?: () => void;
};

const inputClass =
  "mt-1 block w-full min-w-0 rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

/*
 *   Create or edit one add-on, right inside its group on the Add-ons page.
 **/
export default function AddOnForm({
  addOn,
  groupIsSynced,
  isSaving,
  onSave,
  onCancel,
  onDelete,
}: AddOnFormProps) {
  const id = addOn?.id ?? "new";

  const [name, setName] = useState(addOn?.name ?? "");
  const [price, setPrice] = useState(
    addOn ? String(Number(addOn.price)) : "",
  );
  const [description, setDescription] = useState(addOn?.description ?? "");
  const [calories, setCalories] = useState(
    addOn?.calories !== null && addOn?.calories !== undefined
      ? String(addOn.calories)
      : "",
  );
  const [isAvailable, setIsAvailable] = useState(addOn?.isAvailable ?? true);
  // New add-ons in a synced group start synced, like new items.
  const [isSynced, setIsSynced] = useState(addOn?.isSynced ?? groupIsSynced);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const priceNumber = Number(price);

    if (!name.trim()) return setError("An add-on name is required.");

    if (!price.trim() || !Number.isFinite(priceNumber) || priceNumber < 0) {
      return setError("The add-on needs a price of 0 or more.");
    }

    const caloriesNumber = calories.trim() === "" ? null : Number(calories);

    if (
      caloriesNumber !== null &&
      (!Number.isInteger(caloriesNumber) || caloriesNumber < 0)
    ) {
      return setError("Calories must be a whole number of 0 or more.");
    }

    await onSave({
      name: name.trim(),
      price: priceNumber,
      description: description.trim() || null,
      calories: caloriesNumber,
      isAvailable,
      isSynced,
    });
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onSubmit={handleSubmit}
      className="rounded-lg border border-blue-200 bg-blue-50/40 p-4"
      aria-label={addOn ? `Edit ${addOn.name}` : "New add-on"}
    >
      <fieldset disabled={isSaving} className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
          <div className="min-w-0">
            <label htmlFor={`add-on-name-${id}`} className="text-sm font-medium text-gray-900">
              Name
              <RequiredField />
            </label>
            <input
              id={`add-on-name-${id}`}
              type="text"
              className={inputClass}
              placeholder="Extra Cheese"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor={`add-on-price-${id}`} className="text-sm font-medium text-gray-900">
              Price
              <RequiredField />
            </label>
            <input
              id={`add-on-price-${id}`}
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              placeholder="1.50"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-gray-600">
          This is the default price. Each item can set its own price for this
          add-on.
        </p>

        <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
          <div className="min-w-0">
            <label htmlFor={`add-on-description-${id}`} className="text-sm font-medium text-gray-900">
              Description
            </label>
            <input
              id={`add-on-description-${id}`}
              type="text"
              className={inputClass}
              placeholder="Medium heat"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor={`add-on-calories-${id}`} className="text-sm font-medium text-gray-900">
              Calories
            </label>
            <input
              id={`add-on-calories-${id}`}
              type="number"
              min="0"
              step="1"
              className={inputClass}
              placeholder="80"
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
            />
          </div>
        </div>

        <label
          htmlFor={`add-on-available-${id}`}
          className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-900"
        >
          <input
            id={`add-on-available-${id}`}
            type="checkbox"
            className="size-4 accent-blue-600"
            checked={isAvailable}
            onChange={(event) => setIsAvailable(event.target.checked)}
          />
          Available
        </label>

        <IsSyncedCheckbox
          hasSyncGroup={groupIsSynced}
          htmlFor={`add-on-sync-${id}`}
          inputName={`add-on-sync-${id}`}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          isSaving={isSaving}
          description={
            addOn
              ? "Apply changes to this add-on at every location in the synced group. Turning it on for a location's own add-on adds it to the other locations."
              : "Adds this add-on to the same group at every location, kept in sync between updates."
          }
        />

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : addOn ? "Save add-on" : "Create add-on"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete add-on
            </button>
          )}
        </div>
      </fieldset>
    </motion.form>
  );
}
