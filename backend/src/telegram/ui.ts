import { CATEGORY_SLUGS } from "../enums/category.js";

export type InlineButton = { text: string; callback_data: string };
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

function rows(buttons: InlineButton[], width = 2): InlineButton[][] {
  const out: InlineButton[][] = [];
  for (let i = 0; i < buttons.length; i += width) out.push(buttons.slice(i, i + width));
  return out;
}

export function homeKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "Status", callback_data: "m:status" },
        { text: "Today", callback_data: "m:today" },
      ],
      [
        { text: "This month", callback_data: "m:month" },
        { text: "A category", callback_data: "m:spent" },
      ],
      [
        { text: "Scan mail", callback_data: "m:scan" },
        { text: "Connect email", callback_data: "m:gmail" },
      ],
      [
        { text: "Daily limit", callback_data: "m:limit" },
        { text: "Reminder", callback_data: "m:remind" },
      ],
      [
        { text: "Send statement", callback_data: "m:stmt" },
        { text: "Disconnect", callback_data: "m:unlink" },
      ],
    ],
  };
}

export function categoryKeyboard(): InlineKeyboard {
  const buttons = CATEGORY_SLUGS.map((slug) => ({
    text: LABEL[slug] ?? slug,
    callback_data: `c:${slug}`,
  }));
  return { inline_keyboard: [...rows(buttons), [{ text: "Home", callback_data: "m:home" }]] };
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
        { text: "No limit", callback_data: "l:off" },
      ],
      [{ text: "Home", callback_data: "m:home" }],
    ],
  };
}

export function remindKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "9:00", callback_data: "r:540" },
        { text: "13:00", callback_data: "r:780" },
        { text: "21:30", callback_data: "r:1290" },
      ],
      [{ text: "Turn off", callback_data: "r:off" }, { text: "Home", callback_data: "m:home" }],
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
  | { kind: "gmail" }
  | { kind: "limit-menu" }
  | { kind: "remind-menu" }
  | { kind: "statement" }
  | { kind: "unlink" }
  | { kind: "category"; slug: string }
  | { kind: "set-limit"; amount: number | null }
  | { kind: "set-remind"; minute: number | null };

type MenuKind = Exclude<TelegramAction["kind"], "category" | "set-limit" | "set-remind">;

const MENU: Record<string, MenuKind> = {
  home: "home",
  status: "status",
  today: "today",
  month: "month",
  spent: "spent-menu",
  scan: "scan",
  gmail: "gmail",
  limit: "limit-menu",
  remind: "remind-menu",
  stmt: "statement",
  unlink: "unlink",
};

export function parseTelegramAction(data: string): TelegramAction | null {
  const [prefix, value] = data.split(":");
  if (!prefix || value == null) return null;
  if (prefix === "m") {
    const kind = MENU[value];
    return kind ? ({ kind } as TelegramAction) : null;
  }
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
