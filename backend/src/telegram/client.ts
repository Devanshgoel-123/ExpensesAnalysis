import { config } from "../config.js";
import { TELEGRAM_API_BASE } from "../constants/telegram.js";
import { logger } from "../logger/index.js";

export type TelegramChat = {
  id: number;
  type: string;
};

export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

export type TelegramSender = (chatId: string, text: string) => Promise<void>;

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  if (!config.telegram.enabled) return;
  const url = `${TELEGRAM_API_BASE}/bot${config.telegram.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn(
      { status: res.status, body: body.slice(0, 200) },
      "telegram sendMessage failed",
    );
  }
}
