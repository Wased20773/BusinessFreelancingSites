import { useSyncAccess } from "@/components/providers/SyncAccessProvider";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";

type IsSyncedCheckboxProps = {
  hasSyncGroup: boolean;
  htmlFor: string;
  inputName: string;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
  isSaving: boolean;
  description: string;
};

export default function IsSyncedCheckbox({
  hasSyncGroup,
  htmlFor,
  inputName,
  isSynced,
  setIsSynced,
  isSaving,
  description,
}: IsSyncedCheckboxProps) {
  const { syncEnabled, billingHref } = useSyncAccess();

  if (hasSyncGroup !== true) return null;

  /*
   * On Free, sync is locked: the server treats it as off, so changes apply
   * only to this location. Shown unchecked so it doesn't claim otherwise.
   */
  if (!syncEnabled) {
    return (
      // Grid
      <div className="mt-4 hover:scale-[1.01] transition-transform grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] items-center border border-amber-400 rounded-lg bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 p-3 shadow-md shadow-amber-200/60 gap-x-3 gap-y-2">
        {/* Star */}
        <div className="flex h-9 w-9 items-center justify-center md:row-span-2 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm shadow-amber-400/50">
          <Sparkles size={18} />
        </div>

        {/* Checkbox */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Checkbox + label never split: the words wrap beside the box */}
          <div className="flex min-w-0 items-start gap-2">
            <input
              id={htmlFor}
              type="checkbox"
              className="mt-1 shrink-0 cursor-not-allowed accent-amber-500"
              checked={false}
              disabled
              aria-describedby={`${htmlFor}-locked`}
            />
            <label
              htmlFor={htmlFor}
              className="cursor-not-allowed font-semibold text-amber-900"
            >
              Sync to all locations
            </label>
          </div>
          <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-semibold text-amber-800">
            <Lock size={11} />
            Paid plans
          </span>
        </div>

        {/* Description */}
        <div className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-2">
          <p id={`${htmlFor}-locked`} className="text-sm text-amber-800/80">
            Sync is available on paid plans. Update every location at once
            instead of one by one. For now, changes here only apply to this
            location.
          </p>
        </div>

        {/* Call to Action */}
        <div className="col-span-2 md:col-span-1 md:col-start-3 md:row-start-1 md:row-span-2">
          {billingHref && (
            <Link
              href={billingHref}
              className="block text-center rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-3 md:py-1.5 text-sm font-semibold text-white shadow-sm shadow-amber-400/50 transition hover:from-amber-500 hover:to-yellow-600"
            >
              See plans
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <label
      htmlFor={htmlFor}
      className="flex items-start gap-2 cursor-pointer mt-4"
    >
      <input
        id={htmlFor}
        name={inputName}
        type="checkbox"
        className="mt-1"
        checked={isSynced}
        onChange={(event) => setIsSynced(event.target.checked)}
        disabled={isSaving}
      />

      <span>
        <span className="font-semibold block">Sync to all locations</span>
        <span className="text-sm text-gray-500">{description}</span>
      </span>
    </label>
  );
}
