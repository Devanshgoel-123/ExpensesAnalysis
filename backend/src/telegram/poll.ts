import { config } from "../config.js";
import { TELEGRAM_API_BASE } from "../constants/telegram.js";
import { logger } from "../logger/index.js";
import type { TelegramUpdate } from "./client.js";
import { handleTelegramUpdate } from "./service.js";

/**
 * Local dev has no public HTTPS URL, so Telegram cannot POST a webhook.
 * Long-poll getUpdates instead. Production keeps the webhook.
 */
export function startTelegramPolling(): void {
  if (!config.telegram.enabled || config.isProduction) return;
  void run().catch((error: unknown) => {
    logger.error({ err: error }, "telegram polling stopped");
  });
}

async function run(): Promise<void> {
  const token = config.telegram.botToken;
  await fetch(`${TELEGRAM_API_BASE}/bot${token}/deleteWebhook`);
  logger.info({ username: config.telegram.botUsername }, "telegram polling started");
  let offset = 0;
  for (;;) {
    const url = new URL(`${TELEGRAM_API_BASE}/bot${token}/getUpdates`);
    url.searchParams.set("timeout", "25");
    url.searchParams.set("offset", String(offset));
    let payload: { ok?: boolean; result?: TelegramUpdate[] };
    try {
      const response = await fetch(url);
      payload = (await response.json()) as { ok?: boolean; result?: TelegramUpdate[] };
    } catch (error) {
      logger.warn({ err: error }, "telegram getUpdates failed");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      continue;
    }
    for (const update of payload.result ?? []) {
      offset = update.update_id + 1;
      try {
        await handleTelegramUpdate(update);
      } catch (error) {
        logger.warn({ err: error, updateId: update.update_id }, "telegram update failed");
      }
    }
  }
}
