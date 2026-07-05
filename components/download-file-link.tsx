"use client";

import { useState } from "react";
import { getSubmissionFileUrl } from "@/lib/submission-files";

export function DownloadFileLink({
  fileId,
  filename,
  className,
}: {
  fileId: string;
  filename: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await getSubmissionFileUrl(fileId);
    setLoading(false);

    if (result.error || !result.url) {
      setError(result.error ?? "Could not open file");
      return;
    }

    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        }
      >
        {loading ? "Opening..." : filename}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
