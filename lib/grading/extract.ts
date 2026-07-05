import AdmZip from "adm-zip";
import { OfficeParser } from "officeparser";
import { mimeTypeFromExtension } from "@/lib/uploads/constraints";

type ImageMimeType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type ContentBlock =
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
      title?: string;
    }
  | {
      type: "image";
      source: { type: "base64"; media_type: ImageMimeType; data: string };
    }
  | { type: "text"; text: string };

export type ExtractionResult = {
  blocks: ContentBlock[];
  skippedFiles: string[];
};

type InputFile = { filename: string; mimeType: string; bytes: Buffer };

const OFFICE_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

async function extractOne(file: InputFile): Promise<ContentBlock[] | null> {
  const { filename, mimeType, bytes } = file;

  if (mimeType === "application/pdf") {
    return [
      {
        type: "document",
        title: filename,
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: bytes.toString("base64"),
        },
      },
    ];
  }

  const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as ImageMimeType,
          data: bytes.toString("base64"),
        },
      },
    ];
  }

  if (OFFICE_MIME_TYPES.has(mimeType)) {
    const ast = await OfficeParser.parseOffice(bytes);
    return [{ type: "text", text: `[${filename}]\n${ast.toText()}` }];
  }

  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    const zip = new AdmZip(bytes);
    const blocks: ContentBlock[] = [];
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      if (entry.entryName.toLowerCase().endsWith(".zip")) continue; // no recursive zips

      const entryMimeType = mimeTypeFromExtension(entry.entryName);
      if (!entryMimeType) continue;

      const nested = await extractOne({
        filename: entry.entryName,
        mimeType: entryMimeType,
        bytes: entry.getData(),
      });
      if (nested) blocks.push(...nested);
    }
    return blocks;
  }

  return null;
}

export async function extractSubmissionContent(
  files: InputFile[]
): Promise<ExtractionResult> {
  const blocks: ContentBlock[] = [];
  const skippedFiles: string[] = [];

  for (const file of files) {
    const extracted = await extractOne(file);
    if (extracted) {
      blocks.push(...extracted);
    } else {
      skippedFiles.push(file.filename);
    }
  }

  return { blocks, skippedFiles };
}
