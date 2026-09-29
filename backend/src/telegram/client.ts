import { config } from "../config.js";
import { TELEGRAM_API_BASE } from "../constants/telegram.js";
import { logger } from "../logger/index.js";

export type TelegramChat = {
  id: number;
  type: string;
};

export type TelegramDocument = {
  file_id: string;
  file_name?: string;
  mime_type?: string;
};

export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  document?: TelegramDocument;
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: { id: number };
  message?: { message_id: number; chat: TelegramChat };
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramSender = (
  chatId: string,
  text: string,
  extra?: { keyboard?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } },
) => Promise<void>;

export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  if (!config.telegram.enabled) {
    throw new Error("Telegram is not configured");
  }
  const token = config.telegram.botToken;
  const metaRes = await fetch(
    `${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  if (!metaRes.ok) throw new Error("Could not read that file from Telegram");
  const meta = (await metaRes.json()) as { result?: { file_path?: string } };
  const filePath = meta.result?.file_path;
  if (!filePath) throw new Error("Could not read that file from Telegram");
  const fileRes = await fetch(`${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`);
  if (!fileRes.ok) throw new Error("Could not download that file from Telegram");
  return Buffer.from(await fileRes.arrayBuffer());
}

export async function answerTelegramCallback(callbackId: string): Promise<void> {
  if (!config.telegram.enabled) return;
  await fetch(`${TELEGRAM_API_BASE}/bot${config.telegram.botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId }),
  }).catch(() => undefined);
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  extra?: { keyboard?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } },
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
      ...(extra?.keyboard ? { reply_markup: extra.keyboard } : {}),
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
