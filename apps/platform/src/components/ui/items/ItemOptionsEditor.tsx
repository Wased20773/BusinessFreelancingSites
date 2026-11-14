"use client";

import { newOptionDraft, type OptionDraft } from "@/lib/items/optionDrafts";
import { Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import ReorderControls from "../controls/ReorderControls";
import RequiredField from "../RequiredField";

type ItemOptionsEditorProps = {
  canManage: boolean;
  drafts: OptionDraft[];
  setDrafts: Dispatch<SetStateAction<OptionDraft[]>>;
  disabled: boolean;
};

const inputClass =
  "mt-1 block w-full min-w-0 rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

/*
 *   The item's options, edited in place. Nothing here is saved on its own:
 *   the list is sent with the item when the item form is saved.
 *
 *   The inputs have no `name`: they live inside the item's <form>, and
 *   name="name" / name="price" would clash with the item's own fields.
 **/
export default function ItemOptionsEditor({
  canManage,
  drafts,
  setDrafts,
  disabled,
}: ItemOptionsEditorProps) {
  function updateDraft(key: string, changes: Partial<OptionDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...changes } : draft,
      ),
    );
  }

  function removeDraft(key: string) {
    setDrafts((current) => current.filter((draft) => draft.key !== key));
  }

  async function moveDraft(key: string, direction: "up" | "down") {
    setDrafts((current) => {
      const index = current.findIndex((draft) => draft.key === key);
      const target = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  }

  return (
    <section aria-labelledby="item-options-heading">
      <h2
        id="item-options-heading"
        className="text-base font-semibold text-gray-900"
      >
        Options
      </h2>

      <div className="mt-1 space-y-1 text-sm leading-6 text-gray-600">
        <p>
          Add-ons or variations of the item, each with its own price. For
          example, added toppings or different sizes.
        </p>
        <p>
          If the item has a price, option prices are added to it. If the item is
          $0.00, the option price is used instead.
        </p>
        {canManage && (
          <p className="font-medium text-gray-700">
            Options are saved together with the item.
          </p>
        )}
      </div>

      {drafts.length === 0 && (
        <p className="mt-4 text-sm text-gray-600">
          {canManage ? "No options yet." : "This item has no options."}
        </p>
      )}

      {/* Read-only list for members who can't edit the item. */}
      {!canManage && drafts.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-200">
          {drafts.map((draft) => (
            <li
              key={draft.key}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {draft.name}
                </p>
                <p className="text-xs text-gray-600">
                  {draft.isAvailable ? "Available" : "Unavailable"}
                </p>
              </div>
              <p className="text-sm font-medium whitespace-nowrap text-gray-900">
                ${Number(draft.price).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canManage && drafts.length > 0 && (
        <ol className="mt-4 space-y-3">
          {drafts.map((draft, index) => (
            <li
              key={draft.key}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <div className="min-w-0">
                  <label
                    htmlFor={`option-name-${draft.key}`}
                    className="text-sm font-medium text-gray-900"
                  >
                    Name
                    <RequiredField />
                  </label>
                  <input
                    id={`option-name-${draft.key}`}
                    type="text"
                    className={inputClass}
                    placeholder="Extra Cheese"
                    value={draft.name}
                    disabled={disabled}
                    onChange={(event) =>
                      updateDraft(draft.key, { name: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor={`option-price-${draft.key}`}
                    className="text-sm font-medium text-gray-900"
                  >
                    Price
                    <RequiredField />
                  </label>
                  <input
                    id={`option-price-${draft.key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder="1.50"
                    value={draft.price}
                    disabled={disabled}
                    onChange={(event) =>
                      updateDraft(draft.key, { price: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <ReorderControls
                    id={draft.key}
                    isProcessing={disabled}
                    isFirst={index === 0}
                    isLast={index === drafts.length - 1}
                    handleMove={moveDraft}
                  />

                  <label
                    htmlFor={`option-available-${draft.key}`}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-900"
                  >
                    <input
                      id={`option-available-${draft.key}`}
                      type="checkbox"
                      className="size-4 accent-blue-600"
                      checked={draft.isAvailable}
                      disabled={disabled}
                      onChange={(event) =>
                        updateDraft(draft.key, {
                          isAvailable: event.target.checked,
                        })
                      }
                    />
                    Available
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => removeDraft(draft.key)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => setDrafts((current) => [...current, newOptionDraft()])}
          disabled={disabled}
          className="mt-4 inline-flex items-center gap-1 rounded-lg border border-blue-400 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} />
          Add option
        </button>
      )}
    </section>
  );
}
