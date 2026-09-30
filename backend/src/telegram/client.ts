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

export type TelegramContact = {
  phone_number: string;
  first_name?: string;
  user_id?: number;
};

export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: { id: number };
  text?: string;
  caption?: string;
  document?: TelegramDocument;
  contact?: TelegramContact;
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

function plainText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

async function postTelegram(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
): Promise<number | null> {
  if (!config.telegram.enabled) return null;
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  };
  let res = await callTelegram("sendMessage", payload);
  if (res.status === 400) {
    const body = await res.text().catch(() => "");
    if (/parse entities/i.test(body)) {
      res = await callTelegram("sendMessage", {
        ...payload,
        text: plainText(text),
        parse_mode: undefined,
      });
    } else {
      logger.warn({ status: res.status, body: body.slice(0, 200) }, "telegram sendMessage failed");
      return null;
    }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn({ status: res.status, body: body.slice(0, 200) }, "telegram sendMessage failed");
    return null;
  }
  const parsed = (await res.json()) as { result?: { message_id?: number } };
  return parsed.result?.message_id ?? null;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  extra?: { keyboard?: InlineKeyboard },
): Promise<void> {
  await postTelegram(chatId, text, extra?.keyboard as Record<string, unknown> | undefined);
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<boolean> {
  if (!config.telegram.enabled) return false;
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(keyboard ? { reply_markup: keyboard } : {}),
  };
  let res = await callTelegram("editMessageText", payload);
  if (res.status === 400) {
    const body = await res.text().catch(() => "");
    if (/message is not modified/i.test(body)) return true;
    if (/parse entities/i.test(body)) {
      res = await callTelegram("editMessageText", {
        ...payload,
        text: plainText(text),
        parse_mode: undefined,
      });
    } else {
      logger.warn({ status: res.status, body: body.slice(0, 200) }, "telegram editMessage failed");
      return false;
    }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn({ status: res.status, body: body.slice(0, 200) }, "telegram editMessage failed");
    return false;
  }
  return true;
}

/** One message that updates in place while a sync is running. Tests get a fresh send each time. */
export function telegramProgressPublisher(chatId: string, send: TelegramSender) {
  let messageId: number | null = null;
  return async (text: string, keyboard?: InlineKeyboard) => {
    if (send !== sendTelegramMessage) {
      await send(chatId, text, keyboard ? { keyboard } : undefined);
      return;
    }
    if (messageId == null) {
      messageId = await postTelegram(chatId, text, keyboard as Record<string, unknown> | undefined);
      return;
    }
    const edited = await editTelegramMessage(chatId, messageId, text, keyboard);
    if (!edited) {
      messageId = await postTelegram(chatId, text, keyboard as Record<string, unknown> | undefined);
    }
  };
}

export async function askTelegramContact(chatId: string, text: string): Promise<void> {
  await postTelegram(chatId, text, {
    keyboard: [[{ text: "📱 Share my number", request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  });
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
