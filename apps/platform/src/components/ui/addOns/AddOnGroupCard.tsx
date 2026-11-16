"use client";

import ChevronIcon from "@/components/icons/chevron";
import { listRowMotion } from "@/components/motion/listMotion";
import AddOnForm from "@/components/ui/addOns/AddOnForm";
import ReorderControls from "@/components/ui/controls/ReorderControls";
import IsSyncedCheckbox from "@/components/ui/IsSyncedCheckbox";
import DeleteModal from "@/components/ui/modal/DeleteModal";
import {
  createAddOn,
  deleteAddOn,
  deleteAddOnGroup,
  moveAddOn,
  updateAddOn,
  updateAddOnGroup,
  type AddOnFormBody,
} from "@/lib/api/addOns";
import { requestError } from "@/lib/api/requestError";
import { pageOf, paginate } from "@/lib/paginate";
import PageNav from "@/components/ui/controls/PageNav";
import type { AddOnGroupJson, AddOnJson } from "@/types/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type SubmitEvent, useState } from "react";
import { toast } from "sonner";

// How many add-ons a group shows at once; the rest are on the next pages.
export const ADD_ONS_PER_PAGE = 6;

type AddOnGroupCardProps = {
  businessId: string;
  locationId: string;
  group: AddOnGroupJson;
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  isMoving: boolean;
  onMove: (groupId: string, direction: "up" | "down") => Promise<void>;
  // Reloads the page's groups after a change.
  onChanged: () => Promise<void>;
};

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/*
 *   One add-on group on the Add-ons page. It opens and closes; inside are
 *   its add-ons, each edited in place, and a "Create add-on" button.
 **/
export default function AddOnGroupCard({
  businessId,
  locationId,
  group,
  canManage,
  isFirst,
  isLast,
  isMoving,
  onMove,
  onChanged,
}: AddOnGroupCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // What's being edited: the group's name, a new add-on, or an add-on id.
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [renameSynced, setRenameSynced] = useState(group.isSynced);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deletingAddOn, setDeletingAddOn] = useState<AddOnJson | null>(null);

  const addOnsInUse = group.addOns.filter((addOn) => addOn.usedByItems > 0);
  const panelId = `add-on-group-${group.id}`;

  // A page past the end (after a delete) moves back to the last page.
  const current = paginate(group.addOns, page, ADD_ONS_PER_PAGE);

  async function run(
    action: () => Promise<unknown>,
    messages: { loading: string; success: string; error: string },
  ): Promise<boolean> {
    setIsSaving(true);

    try {
      await toast
        .promise(action(), { ...messages, error: requestError(messages.error) })
        .unwrap();
      await onChanged();
      return true;
    } catch (error) {
      console.error(messages.error, error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRename(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newName.trim()) return;

    const saved = await run(
      () =>
        updateAddOnGroup(businessId, locationId, group.id, {
          name: newName.trim(),
          isSynced: renameSynced,
        }),
      {
        loading: "Saving group...",
        success: "Group saved.",
        error: "Failed to save group.",
      },
    );

    if (saved) setIsRenaming(false);
  }

  async function handleCreate(data: AddOnFormBody) {
    const saved = await run(
      () => createAddOn(businessId, locationId, group.id, data),
      {
        loading: "Creating add-on...",
        success: "Add-on created.",
        error: "Failed to create add-on.",
      },
    );

    if (saved) {
      setIsCreating(false);
      // New add-ons go at the end: show the page it landed on.
      setPage(pageOf(group.addOns.length, ADD_ONS_PER_PAGE));
    }
  }

  async function handleUpdate(addOnId: string, data: AddOnFormBody) {
    const saved = await run(
      () => updateAddOn(businessId, locationId, addOnId, data),
      {
        loading: "Saving add-on...",
        success: "Add-on saved.",
        error: "Failed to save add-on.",
      },
    );

    if (saved) setEditingId(null);
  }

  async function handleMoveAddOn(addOnId: string, direction: "up" | "down") {
    const index = group.addOns.findIndex((addOn) => addOn.id === addOnId);

    const moved = await run(
      () => moveAddOn(businessId, locationId, addOnId, direction),
      {
        loading: direction === "up" ? "Moving add-on up" : "Moving add-on down",
        success: "Add-on order updated",
        error: "Failed to move add-on.",
      },
    );

    // Follow it when it moves onto the next or previous page.
    if (moved) {
      setPage(pageOf(index + (direction === "up" ? -1 : 1), ADD_ONS_PER_PAGE));
    }
  }

  async function handleDeleteAddOn() {
    if (!deletingAddOn) return;

    const deleted = await run(
      () =>
        deleteAddOn(
          businessId,
          locationId,
          deletingAddOn.id,
          deletingAddOn.isSynced,
        ),
      {
        loading: "Deleting add-on...",
        success: "Add-on deleted.",
        error: "Failed to delete add-on.",
      },
    );

    if (deleted) {
      setDeletingAddOn(null);
      setEditingId(null);
    }
  }

  async function handleDeleteGroup() {
    const deleted = await run(
      () => deleteAddOnGroup(businessId, locationId, group.id, group.isSynced),
      {
        loading: "Deleting group...",
        success: "Group deleted.",
        error: "Failed to delete group.",
      },
    );

    if (deleted) setDeletingGroup(false);
  }

  return (
    <section
      aria-labelledby={`${panelId}-heading`}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
        {isRenaming ? (
          <form onSubmit={handleRename} className="min-w-0 flex-1 space-y-2">
            <fieldset disabled={isSaving} className="space-y-2">
              <label htmlFor={`${panelId}-name`} className="sr-only">
                Group name
              </label>
              <input
                id={`${panelId}-name`}
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="block w-full min-w-0 rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2"
                autoFocus
              />
              <IsSyncedCheckbox
                hasSyncGroup={Boolean(group.syncGroupId)}
                htmlFor={`${panelId}-sync`}
                inputName={`${panelId}-sync`}
                isSynced={renameSynced}
                setIsSynced={setRenameSynced}
                isSaving={isSaving}
                description="Rename this group at every location in the synced group"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenaming(false);
                    setNewName(group.name);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        ) : (
          // Accordion pattern: the toggle button sits inside the heading.
          <h2 id={`${panelId}-heading`} className="min-w-0 flex-1 text-base">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setIsOpen((open) => !open)}
              className="flex w-full min-w-0 items-center gap-3 text-left"
            >
              <span
                className={`shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`}
              >
                <ChevronIcon direction="down" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold text-gray-900">
                  {group.name}
                </span>
                <span className="block text-sm font-normal text-gray-600">
                  {plural(group.addOns.length, "add-on")}
                  {group.isSynced && " · Synced"}
                </span>
              </span>
            </button>
          </h2>
        )}

        {canManage && !isRenaming && (
          <div className="flex shrink-0 items-center gap-3">
            <ReorderControls
              id={group.id}
              isProcessing={isMoving || isSaving}
              isFirst={isFirst}
              isLast={isLast}
              handleMove={onMove}
            />

            {/* The group's actions, in one ⋮ menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isSaving}
                  aria-label={`${group.name} actions`}
                  className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-50"
                >
                  <EllipsisVertical size={16} />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-44"
                // Let the form that opens keep focus on its first field.
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <DropdownMenuItem onSelect={() => setIsRenaming(true)}>
                  <Pencil />
                  Edit group
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setIsOpen(true);
                    setEditingId(null);
                    setIsCreating(true);
                  }}
                >
                  <Plus />
                  Create add-on
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeletingGroup(true)}
                >
                  <Trash2 />
                  Delete group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Add-ons */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 py-4 sm:px-5">
              {/* New add-ons are made at the top, right under the header. */}
              {canManage && isCreating && (
                <AddOnForm
                  groupIsSynced={Boolean(group.syncGroupId)}
                  isSaving={isSaving}
                  onSave={handleCreate}
                  onCancel={() => setIsCreating(false)}
                />
              )}

              {group.addOns.length === 0 && !isCreating && (
                <p className="text-sm text-gray-600">
                  No add-ons in this group yet.
                  {canManage && " Use the ⋮ menu above to create one."}
                </p>
              )}

              {group.addOns.length > 0 && (
                <ul className="divide-y divide-gray-200">
                  {current.items.map((addOn, index) => (
                    <motion.li
                      key={addOn.id}
                      {...listRowMotion(index)}
                      className="py-3"
                    >
                      {editingId === addOn.id ? (
                        <AddOnForm
                          addOn={addOn}
                          groupIsSynced={Boolean(group.syncGroupId)}
                          isSaving={isSaving}
                          onSave={(data) => handleUpdate(addOn.id, data)}
                          onCancel={() => setEditingId(null)}
                          onDelete={() => setDeletingAddOn(addOn)}
                        />
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                              <span className="truncate">{addOn.name}</span>
                              {!addOn.isAvailable && (
                                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                                  Unavailable
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              {[
                                addOn.description,
                                addOn.calories !== null
                                  ? `${addOn.calories} kcal`
                                  : null,
                                addOn.usedByItems > 0
                                  ? `Used by ${plural(addOn.usedByItems, "item")}`
                                  : "Not used yet",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-medium whitespace-nowrap text-gray-900">
                              ${Number(addOn.price).toFixed(2)}
                            </span>
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCreating(false);
                                    setEditingId(addOn.id);
                                  }}
                                  disabled={isSaving}
                                  aria-label={`Edit ${addOn.name}`}
                                  className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
                                >
                                  <Pencil size={16} />
                                </button>
                                <ReorderControls
                                  id={addOn.id}
                                  isProcessing={isSaving}
                                  // Position in the whole group, not just this page.
                                  isFirst={current.start + index === 0}
                                  isLast={
                                    current.start + index ===
                                    group.addOns.length - 1
                                  }
                                  handleMove={handleMoveAddOn}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.li>
                  ))}
                </ul>
              )}

              {group.addOns.length > ADD_ONS_PER_PAGE && (
                <PageNav
                  page={current.page}
                  pageCount={current.pageCount}
                  onChange={setPage}
                  label={`${group.name} add-on pages`}
                  className="mt-2"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteModal
        isOpen={deletingAddOn !== null}
        title={`Delete ${deletingAddOn?.name ?? "add-on"}?`}
        isDeleting={isSaving}
        onCancel={() => setDeletingAddOn(null)}
        onConfirm={handleDeleteAddOn}
        description={
          <div className="space-y-2">
            {deletingAddOn && deletingAddOn.usedByItems > 0 ? (
              <p>
                It&apos;s used by {plural(deletingAddOn.usedByItems, "item")}.
                Those items will no longer include it.
              </p>
            ) : (
              <p>No items use this add-on.</p>
            )}
            <p className="text-sm">
              To keep it saved for later, edit it and turn off{" "}
              <strong>Available</strong> instead.
            </p>
            {deletingAddOn?.isSynced && (
              <p className="text-sm">
                It&apos;s synced, so it&apos;s also deleted at your other
                locations.
              </p>
            )}
          </div>
        }
      />

      <DeleteModal
        isOpen={deletingGroup}
        title={`Delete ${group.name}?`}
        isDeleting={isSaving}
        onCancel={() => setDeletingGroup(false)}
        onConfirm={handleDeleteGroup}
        description={
          <div className="space-y-2">
            <p>
              This also deletes its {plural(group.addOns.length, "add-on")}.
              {addOnsInUse.length > 0 &&
                ` ${addOnsInUse.length} of them ${
                  addOnsInUse.length === 1 ? "is" : "are"
                } used by items, and those items will no longer include ${
                  addOnsInUse.length === 1 ? "it" : "them"
                }.`}
            </p>
            {group.isSynced && (
              <p className="text-sm">
                It&apos;s synced, so it&apos;s also deleted at your other
                locations.
              </p>
            )}
          </div>
        }
      />
    </section>
  );
}
