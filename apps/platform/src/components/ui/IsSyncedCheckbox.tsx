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
  return (
    <>
      {hasSyncGroup === true && (
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
            <span className="font-semibold block">Add to all locations</span>
            <span className="text-sm text-gray-500">{description}</span>
          </span>
        </label>
      )}
    </>
  );
}
