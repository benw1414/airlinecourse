"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteSubmissionFile,
  markSubmitted,
  recordUploadedFile,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isAllowedFile, MAX_FILE_SIZE_BYTES } from "@/lib/uploads/constraints";

type SubmissionFile = {
  id: string;
  original_filename: string;
  scan_status: string;
};

const initialState: ActionState = { error: null };

function scanBadgeVariant(status: string) {
  if (status === "clean") return "default" as const;
  if (status === "infected") return "destructive" as const;
  return "outline" as const;
}

export function UploadWidget({
  studentId,
  subjectId,
  assignmentId,
  submissionId,
  files,
  status,
}: {
  studentId: string;
  subjectId: string;
  assignmentId: string;
  submissionId: string;
  files: SubmissionFile[];
  status: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("File exceeds the 25MB per-file limit");
      return;
    }
    if (!isAllowedFile(file.name, file.type)) {
      setUploadError(
        "This file type isn't supported. Allowed: PDF, Word, PowerPoint, Excel, images, or zip."
      );
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${subjectId}/${assignmentId}/${studentId}/${submissionId}/${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("submissions")
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        setUploadError(uploadErr.message);
        return;
      }

      const formData = new FormData();
      formData.set("submissionId", submissionId);
      formData.set("subjectId", subjectId);
      formData.set("assignmentId", assignmentId);
      formData.set("storagePath", path);
      formData.set("originalFilename", file.name);
      formData.set("mimeType", file.type);
      formData.set("sizeBytes", String(file.size));

      const result = await recordUploadedFile(initialState, formData);
      if (result.error) setUploadError(result.error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string, storagePath: string) {
    const formData = new FormData();
    formData.set("fileId", fileId);
    formData.set("storagePath", storagePath);
    formData.set("subjectId", subjectId);
    formData.set("assignmentId", assignmentId);
    await deleteSubmissionFile(initialState, formData);
  }

  async function handleSubmit() {
    const formData = new FormData();
    formData.set("submissionId", submissionId);
    formData.set("subjectId", subjectId);
    formData.set("assignmentId", assignmentId);
    await markSubmitted(initialState, formData);
  }

  return (
    <div className="flex flex-col gap-4">
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
            >
              <span>{file.original_filename}</span>
              <div className="flex items-center gap-2">
                <Badge variant={scanBadgeVariant(file.scan_status)}>
                  {file.scan_status}
                </Badge>
                {status === "draft" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(file.id, `${subjectId}/${assignmentId}/${studentId}/${submissionId}/${file.original_filename}`)
                    }
                    className="text-xs text-muted-foreground underline underline-offset-4"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {status === "draft" && (
        <>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="text-sm"
            />
            {uploading && (
              <span className="text-sm text-muted-foreground">Uploading...</span>
            )}
          </div>
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={files.length === 0}
          >
            Submit assignment
          </Button>
        </>
      )}

      {status !== "draft" && (
        <Badge variant="secondary" className="w-fit">
          Submitted{" "}
          {status === "graded_pending_review" && "· pending review"}
          {status === "published" && "· graded"}
        </Badge>
      )}
    </div>
  );
}
