import ChevronIcon from "@/components/icons/chevron";
import { ReorderDirection } from "@/lib/api/reorder";

type ReorderControlsParams = {
  id: string;
  isProcessing: boolean;
  isFirst: boolean;
  isLast: boolean;
  handleMove(id: string, direction: ReorderDirection): Promise<void>;
};

export default function ReorderControls({
  id,
  isProcessing,
  isFirst,
  isLast,
  handleMove,
}: ReorderControlsParams) {
  return (
    <div className="w-fit flex flex-col gap-1">
      <button
        className="bg-gray-400 px-3 py-1 rounded-t-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        disabled={isProcessing || isFirst}
        onClick={() => handleMove(id, "up")}
      >
        <ChevronIcon direction="up" size={20} />
      </button>
      <button
        className="bg-gray-300 px-3 py-1 rounded-b-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        disabled={isProcessing || isLast}
        onClick={() => handleMove(id, "down")}
      >
        <ChevronIcon direction="down" size={20} />
      </button>
    </div>
  );
}
