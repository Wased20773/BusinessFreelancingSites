"use client";

type DownloadJsonButtonProps = {
  fileName: string;
  data: unknown;
  label: string;
  variant?: "primary" | "secondary";
};

/*
 *   Downloads `data` as a pretty-printed JSON file. Everything happens in the
 *   browser; nothing is fetched from the API.
 **/
export default function DownloadJsonButton({
  fileName,
  data,
  label,
  variant = "secondary",
}: DownloadJsonButtonProps) {
  function handleDownload() {
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={
        variant === "primary"
          ? "shrink-0 rounded-lg border border-green-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-green-900 transition-colors hover:bg-emerald-400"
          : "shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100"
      }
    >
      {label}
    </button>
  );
}
