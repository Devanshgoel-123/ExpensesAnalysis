/** Prefix on Settings-generated /start payloads. */
export const TELEGRAM_START_PREFIX = "ll_";

/** Header Telegram sends when we register a webhook secret. */
export const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export const TELEGRAM_API_BASE = "https://api.telegram.org";

/** Telegram lets a bot delete messages only while they are under 48 hours old. */
export const TELEGRAM_DELETE_WINDOW_HOURS = 48;

/** How far back from the newest message id a chat clear reaches. Ids in a private chat count up by one per message. */
export const TELEGRAM_CLEAR_SPAN = 1000;

/** deleteMessages accepts at most 100 ids per call. */
export const TELEGRAM_DELETE_BATCH = 100;
