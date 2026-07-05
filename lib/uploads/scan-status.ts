// "error" covers both a genuine scan failure and "no scanner configured"
// (see lib/uploads/virus-scan.ts) — from the lecturer/student's point of
// view both just mean "we don't know this file is safe yet", not that
// something went wrong with their upload. Label it accordingly rather
// than surfacing the raw enum value.
export function scanStatusLabel(status: string): string {
  switch (status) {
    case "clean":
      return "Clean";
    case "infected":
      return "Infected";
    case "pending":
      return "Scanning…";
    case "error":
      return "Unscanned";
    default:
      return status;
  }
}

export function scanStatusBadgeVariant(
  status: string
): "default" | "destructive" | "outline" {
  if (status === "clean") return "default";
  if (status === "infected") return "destructive";
  return "outline";
}
