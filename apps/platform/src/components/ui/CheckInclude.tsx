import { Check, X } from "lucide-react";

export type IncludeType = "included" | "not-included" | "unchanged";

type CheckIncludeProps = {
  content: string;
  variant: IncludeType;
};

export default function CheckInclude({ content, variant }: CheckIncludeProps) {
  const variantStyle =
    variant === "included"
      ? "border-sky-500 bg-sky-400"
      : variant === "not-included"
        ? "border-red-500 bg-red-400"
        : variant === "unchanged" && "border-gray-400 bg-gray-300";

  return (
    <div className={`inline-flex gap-2`}>
      {/* status */}
      <div
        className={`w-fit h-fit border border-[0.15rem] rounded-full p-0.5 ${variantStyle}`}
      >
        {variant === "included" ? (
          <Check className="text-white w-4 h-4" />
        ) : variant === "not-included" ? (
          <X className="text-white w-4 h-4" />
        ) : (
          variant === "unchanged" && <div className="text-white w-4 h-4"></div>
        )}
      </div>

      <p>{content}</p>
    </div>
  );
}
