export const TELEGRAM_HELP = [
  "Ledgerline",
  "/status — today, this month, and your limit",
  "/today — what you spent today",
  "/month — money out and money in this month",
  "/spent food — one category this month",
  "/limit 800 — daily cap, or /limit off",
  "/remind 21:30 — a daily note in IST, or /remind off",
  "/gmail — connect this account's email",
  "/scan — read bank mail into this account",
  "/statement — send a PDF statement in this chat",
  "/unlink — disconnect this chat",
  "When I ask about a new payment, reply with a category.",
].join("\n");

export type TelegramCommand =
  | { kind: "help" }
  | { kind: "status" }
  | { kind: "today" }
  | { kind: "month" }
  | { kind: "spent"; category: string }
  | { kind: "limit"; amount: number | null; valid: boolean }
  | { kind: "remind"; minute: number | null; valid: boolean }
  | { kind: "unlink" }
  | { kind: "gmail" }
  | { kind: "scan"; password: string }
  | { kind: "statement" }
  | { kind: "unknown"; name: string };

function commandName(text: string): { name: string; rest: string } | null {
  const match = text.trim().match(/^\/([a-z0-9_]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return { name: match[1]!.toLowerCase(), rest: (match[2] ?? "").trim() };
}

export function parseReminderClock(raw: string): number | null {
  const match = raw.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatReminderClock(minute: number): string {
  const hour = Math.floor(minute / 60);
  const mins = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return null;
  return Math.round(amount);
}

/** Slash commands. Anything else is a category reply for a pending spend. */
export function parseTelegramCommand(text: string): TelegramCommand | null {
  const command = commandName(text);
  if (!command) return null;
  switch (command.name) {
    case "help":
    case "start":
      return command.name === "start" ? null : { kind: "help" };
    case "status":
      return { kind: "status" };
    case "today":
      return { kind: "today" };
    case "month":
      return { kind: "month" };
    case "spent":
    case "category":
      return { kind: "spent", category: command.rest };
    case "limit":
      if (/^off$/i.test(command.rest)) return { kind: "limit", amount: null, valid: true };
      {
        const amount = parseAmount(command.rest);
        return { kind: "limit", amount, valid: amount != null };
      }
    case "remind":
    case "reminder":
      if (/^off$/i.test(command.rest)) return { kind: "remind", minute: null, valid: true };
      {
        const minute = parseReminderClock(command.rest);
        return { kind: "remind", minute, valid: minute != null };
      }
    case "unlink":
      return { kind: "unlink" };
    case "gmail":
    case "email":
      return { kind: "gmail" };
    case "scan":
      return { kind: "scan", password: command.rest };
    case "statement":
      return { kind: "statement" };
    default:
      return { kind: "unknown", name: command.name };
  }
}
