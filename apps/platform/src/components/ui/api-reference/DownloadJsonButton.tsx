"use client";

import { saveFile } from "@/lib/saveFile";

type DownloadJsonButtonProps = {
  fileName: string;
  data: unknown;
  label: string;
};

/*
 *   Downloads `data` as a pretty-printed JSON file. Everything happens in the
 *   browser; nothing is fetched from the API.
 **/
export default function DownloadJsonButton({
  fileName,
  data,
  label,
}: DownloadJsonButtonProps) {
  function handleDownload() {
    saveFile(
      new Blob([`${JSON.stringify(data, null, 2)}\n`], {
        type: "application/json",
      }),
      fileName,
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100"
    >
      {label}
    </button>
  );
}
