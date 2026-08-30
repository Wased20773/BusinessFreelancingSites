import "@/app/dashboard/(protected)/page.css";
import type { ReorderDirection } from "@/lib/api/reorder";
import type { ItemOptionsJson } from "@/types/types";
import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import CreateOptionForm from "../item-options/CreateOptionForm";
import ExistingOptionsForm from "../item-options/ExistingOptionsForm";

type ItemOptionsFormProps = {
  options: ItemOptionsJson[];
  processingOptionId: string | null;
  isCreatingOption: boolean;
  createOptionIsSynced: boolean;
  hasSyncGroup: boolean;
  isDeletingOption: boolean;
  handleCreateOption(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleUpdateOption(
    event: SubmitEvent<HTMLFormElement>,
    optionId: string,
  ): Promise<void>;
  setCreateOptionIsSynced: Dispatch<SetStateAction<boolean>>;
  handleMoveOption(
    optionId: string,
    direction: ReorderDirection,
  ): Promise<void>;
  handleDeleteOption(
    event: React.MouseEvent<HTMLButtonElement>,
    optionId: string,
  ): Promise<void>;
};

export default function ItemOptionsForm({
  handleCreateOption,
  isCreatingOption,
  options,
  processingOptionId,
  createOptionIsSynced,
  setCreateOptionIsSynced,
  hasSyncGroup,
  handleUpdateOption,
  handleMoveOption,
  handleDeleteOption,
  isDeletingOption,
}: ItemOptionsFormProps) {
  return (
    <section
      className="dashboard-card mt-[1.5rem] p-4"
      aria-labelledby="item-options-heading"
    >
      <h2 id="item-options-heading">Item Options</h2>

      {/* CREATE OPTION */}
      <CreateOptionForm
        handleCreateOption={handleCreateOption}
        isCreatingOption={isCreatingOption}
        isSynced={createOptionIsSynced}
        setIsSynced={setCreateOptionIsSynced}
        hasSyncGroup={hasSyncGroup}
      />

      {/* EXISTING OPTIONS */}
      <ExistingOptionsForm
        options={options}
        processingOptionId={processingOptionId}
        handleUpdateOption={handleUpdateOption}
        handleMoveOption={handleMoveOption}
        handleDeleteOption={handleDeleteOption}
        isDeletingOption={isDeletingOption}
      />
    </section>
  );
}
