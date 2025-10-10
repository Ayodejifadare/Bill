export function getInitials(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
