export type ScanResult = "clean" | "infected" | "error";

// Cloudmersive's free-tier virus scan API. If no key is configured, scanning
// is skipped entirely and files are marked "error" so they stay visible to
// the lecturer as unscanned rather than silently treated as clean.
export async function scanFileForViruses(
  bytes: ArrayBuffer,
  filename: string
): Promise<ScanResult> {
  const apiKey = process.env.CLOUDMERSIVE_API_KEY;
  if (!apiKey) return "error";

  const form = new FormData();
  form.append("inputFile", new Blob([bytes]), filename);

  try {
    const response = await fetch(
      "https://api.cloudmersive.com/virus/scan/file",
      {
        method: "POST",
        headers: { Apikey: apiKey },
        body: form,
      }
    );

    if (!response.ok) return "error";

    const result = await response.json();
    return result.CleanResult ? "clean" : "infected";
  } catch {
    return "error";
  }
}
