export function formatStudentName(
  fullName: string | null | undefined,
  nickname: string | null | undefined
): string {
  if (!fullName) return "";
  return nickname ? `${fullName} (${nickname})` : fullName;
}
