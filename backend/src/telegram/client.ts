import { config } from "../config.js";
import {
  TELEGRAM_API_BASE,
  TELEGRAM_CLEAR_SPAN,
  TELEGRAM_DELETE_BATCH,
} from "../constants/telegram.js";
import { logger } from "../logger/index.js";
import type { InlineKeyboard } from "./ui.js";

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
  extra?: { keyboard?: InlineKeyboard },
) => Promise<void>;

/** Deletes a chat's messages from `newestId` back. */
export type TelegramChatClearer = (chatId: string, newestId: number) => Promise<void>;

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

export async function registerTelegramCommands(): Promise<void> {
  if (!config.telegram.enabled) return;
  await fetch(`${TELEGRAM_API_BASE}/bot${config.telegram.botToken}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "sync", description: "Sync Gmail" },
        { command: "status", description: "Today, this month, and your limit" },
        { command: "today", description: "What you spent today" },
        { command: "month", description: "Money out and money in this month" },
        { command: "clear", description: "Clear this chat. Expenses stay saved" },
      ],
    }),
  }).catch(() => undefined);
}

export async function answerTelegramCallback(callbackId: string): Promise<void> {
  if (!config.telegram.enabled) return;
  await fetch(`${TELEGRAM_API_BASE}/bot${config.telegram.botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId }),
  }).catch(() => undefined);
}

export async function clearTelegramReplyKeyboard(chatId: string): Promise<void> {
  if (!config.telegram.enabled) return;
  await fetch(`${TELEGRAM_API_BASE}/bot${config.telegram.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "Buttons now sit under each message.",
      reply_markup: { remove_keyboard: true },
    }),
  }).catch(() => undefined);
}

async function callTelegram(method: string, payload: Record<string, unknown>): Promise<Response> {
  return fetch(`${TELEGRAM_API_BASE}/bot${config.telegram.botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  extra?: { keyboard?: InlineKeyboard },
): Promise<void> {
  if (!config.telegram.enabled) return;
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(extra?.keyboard ? { reply_markup: extra.keyboard } : {}),
  };
  let res = await callTelegram("sendMessage", payload);
  if (res.status === 400) {
    const body = await res.text().catch(() => "");
    if (/parse entities/i.test(body)) {
      const plain = text.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      res = await callTelegram("sendMessage", { ...payload, text: plain, parse_mode: undefined });
    }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn(
      { status: res.status, body: body.slice(0, 200) },
      "telegram sendMessage failed",
    );
  }
}

async function deleteOne(chatId: string, messageId: number): Promise<void> {
  await callTelegram("deleteMessage", { chat_id: chatId, message_id: messageId }).catch(() => null);
}

/**
 * Walks back from the newest message in batches. A batch fails once it reaches
 * messages past Telegram's 48-hour delete window; that batch is retried one by
 * one so the newer messages in it still go, and the walk stops there.
 */
export const clearTelegramChat: TelegramChatClearer = async (chatId, newestId) => {
  if (!config.telegram.enabled) return;
  const oldest = Math.max(1, newestId - TELEGRAM_CLEAR_SPAN + 1);
  for (let top = newestId; top >= oldest; top -= TELEGRAM_DELETE_BATCH) {
    const ids: number[] = [];
    for (let id = top; id > top - TELEGRAM_DELETE_BATCH && id >= oldest; id -= 1) ids.push(id);
    const res = await callTelegram("deleteMessages", { chat_id: chatId, message_ids: ids }).catch(
      () => null,
    );
    if (res?.ok) continue;
    for (const id of ids) await deleteOne(chatId, id);
    break;
  }
};
