export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthBounds(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function monthFromDate(date: string | null | undefined): string | null {
  if (!date || date.length < 7) return null;
  return date.slice(0, 7);
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
