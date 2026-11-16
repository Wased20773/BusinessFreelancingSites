"use client";

import { saveFile } from "@/lib/saveFile";
import { useState } from "react";

type DownloadBusinessJsonButtonProps = {
  businessId: string;
};

// The file name the route sends, e.g. filename="tacos-2026-11-15.json".
function fileNameFrom(response: Response): string {
  const header = response.headers.get("content-disposition") ?? "";
  const match = header.match(/filename="([^"]+)"/);

  return match?.[1] ?? "business.json";
}

/*
 *   Downloads all of the business's data (every location's schedule, menu,
 *   add-ons, contacts and socials) as one JSON file.
 *   See GET /api/businesses/[businessId]/export.
 **/
export default function DownloadBusinessJsonButton({
  businessId,
}: DownloadBusinessJsonButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/businesses/${businessId}/export`);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(body?.error ?? "Failed to download business data");
      }

      saveFile(await response.blob(), fileNameFrom(response));
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download business data",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="rounded-lg border border-green-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-green-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDownloading ? "Downloading..." : "Download Business JSON"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
