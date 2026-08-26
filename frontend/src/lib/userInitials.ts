export function userInitials(
  user?: { email?: string | null; displayName?: string | null } | null,
): string {
  const name = user?.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts[1]?.[0] ?? "";
    const initials = `${first}${last}`.toUpperCase();
    if (initials) return initials;
  }
  const local = user?.email?.split("@")[0] ?? "LL";
  return local.slice(0, 2).toUpperCase();
}
