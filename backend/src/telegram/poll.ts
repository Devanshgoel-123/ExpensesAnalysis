import { config } from "../config.js";
import { TELEGRAM_API_BASE } from "../constants/telegram.js";
import { logger } from "../logger/index.js";
import { answerTelegramCallback, type TelegramUpdate } from "./client.js";
import { handleTelegramUpdate } from "./service.js";

/**
 * This machine pulls updates from Telegram. No public URL or ngrok tunnel is
 * required. Production with a real webhook host skips polling.
 */
export function startTelegramPolling(): void {
  if (!config.telegram.enabled || config.isProduction) return;
  void run().catch((error: unknown) => {
    logger.error({ err: error }, "telegram polling stopped");
  });
}

function failureReason(error: unknown): string {
  if (error && typeof error === "object" && "cause" in error && error.cause instanceof Error) {
    return error.cause.message;
  }
  if (error instanceof Error) return error.message.split("\n")[0]?.slice(0, 180) ?? error.message;
  return String(error);
}

async function run(): Promise<void> {
  const token = config.telegram.botToken;
  try {
    await fetch(`${TELEGRAM_API_BASE}/bot${token}/deleteWebhook`);
  } catch (error) {
    logger.warn({ reason: failureReason(error) }, "telegram webhook clear failed, polling anyway");
  }
  logger.info({ username: config.telegram.botUsername }, "telegram polling started");
  let offset = 0;
  let offline = false;
  let delay = 3_000;
  const lanes = new Map<string, Promise<void>>();
  const enqueue = (chatId: string, job: () => Promise<void>) => {
    const prev = lanes.get(chatId) ?? Promise.resolve();
    const next = prev.then(job, job);
    lanes.set(chatId, next);
    void next.finally(() => {
      if (lanes.get(chatId) === next) lanes.delete(chatId);
    });
  };
  for (;;) {
    const url = new URL(`${TELEGRAM_API_BASE}/bot${token}/getUpdates`);
    url.searchParams.set("timeout", "25");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("allowed_updates", JSON.stringify(["message", "callback_query"]));
    let payload: { ok?: boolean; result?: TelegramUpdate[] };
    try {
      const response = await fetch(url);
      payload = (await response.json()) as { ok?: boolean; result?: TelegramUpdate[] };
    } catch (error) {
      if (!offline) {
        logger.warn({ reason: failureReason(error) }, "telegram unreachable, retrying");
        offline = true;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 60_000);
      continue;
    }
    if (offline) {
      logger.info({ username: config.telegram.botUsername }, "telegram polling resumed");
      offline = false;
    }
    delay = 3_000;
    for (const update of payload.result ?? []) {
      offset = update.update_id + 1;
      // Stop the button spinner before any earlier update finishes. A Gmail
      // sync must not sit in front of the next getUpdates.
      if (update.callback_query?.id) void answerTelegramCallback(update.callback_query.id);
      const chatId = String(
        update.callback_query?.message?.chat.id ??
          update.callback_query?.from.id ??
          update.message?.chat.id ??
          "unknown",
      );
      enqueue(chatId, async () => {
        try {
          await handleTelegramUpdate(update);
        } catch (error) {
          logger.warn({ err: error, updateId: update.update_id }, "telegram update failed");
        }
      });
    }
  }
}
