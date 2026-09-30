import { CATEGORY_SLUGS } from "../enums/category.js";

export type InlineButton = { text: string; callback_data: string } | { text: string; url: string };
export type InlineKeyboard = { inline_keyboard: InlineButton[][] };

const LABEL: Record<string, string> = {
  food: "Food",
  shopping: "Shopping",
  travel: "Travel",
  rides: "Rides",
  stays: "Stays",
  petrol: "Petrol",
  "scooty-rental": "Scooty",
  healthcare: "Healthcare",
  pharmacy: "Pharmacy",
  family: "Family",
  household: "Household",
  grocery: "Grocery",
  rent: "Rent",
  "passed-on": "Passed on",
  brokerage: "Brokerage",
  outing: "Outing",
  dinner: "Dinner",
  sports: "Sports",
  "fun-activity": "Fun",
  investments: "Investments",
  vices: "Vices",
  booze: "Booze",
  cigarettes: "Cigarettes",
  banks: "Banks",
  personal: "Personal",
  salon: "Salon",
  "random-expense": "Random",
  salary: "Salary",
  "from-home": "From home",
  other: "Other",
};

const ICON: Record<string, string> = {
  food: "🍔",
  shopping: "🛍",
  travel: "✈️",
  rides: "🚕",
  stays: "🏨",
  petrol: "⛽",
  "scooty-rental": "🛵",
  healthcare: "🩺",
  pharmacy: "💊",
  family: "👨‍👩‍👧",
  household: "🏠",
  grocery: "🥦",
  rent: "🔑",
  "passed-on": "🔁",
  brokerage: "🤝",
  outing: "🎡",
  dinner: "🍽",
  sports: "⚽",
  "fun-activity": "🎉",
  investments: "📈",
  vices: "😈",
  booze: "🍺",
  cigarettes: "🚬",
  banks: "🏦",
  personal: "👤",
  salon: "💇",
  "random-expense": "🎲",
  salary: "💼",
  "from-home": "🏡",
  other: "📦",
};

/** Messages go out with parse_mode HTML, so anything from a bank or a user must be escaped. */
export function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function categoryIcon(slug: string): string {
  return ICON[slug] ?? "🏷";
}

/** Ten-cell bar for spend against a limit; cells past the limit show red. */
export function spendBar(spent: number, limit: number): string {
  const ratio = limit > 0 ? spent / limit : 0;
  const filled = Math.min(10, Math.round(ratio * 10));
  const cell = ratio > 1 ? "🟥" : ratio >= 0.8 ? "🟧" : "🟩";
  return `${cell.repeat(filled)}${"⬜".repeat(10 - filled)} ${Math.round(ratio * 100)}%`;
}

function rows(buttons: InlineButton[], width = 2): InlineButton[][] {
  const out: InlineButton[][] = [];
  for (let i = 0; i < buttons.length; i += width) out.push(buttons.slice(i, i + width));
  return out;
}

const HOME_ROW: InlineButton[] = [{ text: "🏠 Home", callback_data: "m:home" }];

export function homeKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "📊 Status", callback_data: "m:status" },
        { text: "☀️ Today", callback_data: "m:today" },
      ],
      [
        { text: "🗓 This month", callback_data: "m:month" },
        { text: "🏷 A category", callback_data: "m:spent" },
      ],
      [
        { text: "🔄 Sync Gmail", callback_data: "m:sync" },
        { text: "📧 Connect email", callback_data: "m:gmail" },
      ],
      [
        { text: "🎯 Daily limit", callback_data: "m:limit" },
        { text: "⏰ Reminder", callback_data: "m:remind" },
      ],
      [
        { text: "📄 Send statement", callback_data: "m:stmt" },
        { text: "🧹 Clear chat", callback_data: "m:clear" },
      ],
      [
        { text: "👤 Profile", callback_data: "m:profile" },
        { text: "🔌 Disconnect", callback_data: "m:unlink" },
      ],
    ],
  };
}

export function linkKeyboard(text: string, url: string): InlineKeyboard {
  return { inline_keyboard: [[{ text, url }], HOME_ROW] };
}

export function clearConfirmKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "🧹 Yes, clear", callback_data: "x:clear" },
        { text: "✖️ Cancel", callback_data: "m:home" },
      ],
    ],
  };
}

export function choiceKeyboard(
  choices: Array<{ slug: string; label: string }>,
): InlineKeyboard {
  const buttons = choices.map((choice) => ({
    text: `${categoryIcon(choice.slug)} ${choice.label}`,
    callback_data: `c:${choice.slug}`,
  }));
  return { inline_keyboard: [...rows(buttons), HOME_ROW] };
}

export function categoryKeyboard(): InlineKeyboard {
  const buttons = CATEGORY_SLUGS.map((slug) => ({
    text: `${categoryIcon(slug)} ${LABEL[slug] ?? slug}`,
    callback_data: `c:${slug}`,
  }));
  return { inline_keyboard: [...rows(buttons, 3), HOME_ROW] };
}

export function limitKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "₹500", callback_data: "l:500" },
        { text: "₹800", callback_data: "l:800" },
        { text: "₹1,500", callback_data: "l:1500" },
      ],
      [
        { text: "₹3,000", callback_data: "l:3000" },
        { text: "🚫 No limit", callback_data: "l:off" },
      ],
      HOME_ROW,
    ],
  };
}

export function remindKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "🌅 9:00", callback_data: "r:540" },
        { text: "🌤 13:00", callback_data: "r:780" },
        { text: "🌙 21:30", callback_data: "r:1290" },
      ],
      [{ text: "🔕 Turn off", callback_data: "r:off" }, ...HOME_ROW],
    ],
  };
}

export type TelegramAction =
  | { kind: "home" }
  | { kind: "status" }
  | { kind: "today" }
  | { kind: "month" }
  | { kind: "spent-menu" }
  | { kind: "scan" }
  | { kind: "sync" }
  | { kind: "gmail" }
  | { kind: "limit-menu" }
  | { kind: "remind-menu" }
  | { kind: "statement" }
  | { kind: "profile" }
  | { kind: "unlink" }
  | { kind: "clear-menu" }
  | { kind: "clear" }
  | { kind: "category"; slug: string }
  | { kind: "set-limit"; amount: number | null }
  | { kind: "set-remind"; minute: number | null };

type MenuKind = Exclude<TelegramAction["kind"], "category" | "set-limit" | "set-remind" | "clear">;

const MENU: Record<string, MenuKind> = {
  home: "home",
  status: "status",
  today: "today",
  month: "month",
  spent: "spent-menu",
  scan: "scan",
  sync: "sync",
  gmail: "gmail",
  limit: "limit-menu",
  remind: "remind-menu",
  stmt: "statement",
  profile: "profile",
  unlink: "unlink",
  clear: "clear-menu",
};

export function parseTelegramAction(data: string): TelegramAction | null {
  const [prefix, value] = data.split(":");
  if (!prefix || value == null) return null;
  if (prefix === "m") {
    const kind = MENU[value];
    return kind ? ({ kind } as TelegramAction) : null;
  }
  if (prefix === "x" && value === "clear") return { kind: "clear" };
  if (prefix === "c" && (CATEGORY_SLUGS as readonly string[]).includes(value)) {
    return { kind: "category", slug: value };
  }
  if (prefix === "l") {
    if (value === "off") return { kind: "set-limit", amount: null };
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return { kind: "set-limit", amount };
  }
  if (prefix === "r") {
    if (value === "off") return { kind: "set-remind", minute: null };
    const minute = Number(value);
    if (!Number.isInteger(minute) || minute < 0 || minute >= 24 * 60) return null;
    return { kind: "set-remind", minute };
  }
  return null;
}
