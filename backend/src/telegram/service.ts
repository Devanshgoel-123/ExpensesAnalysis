import { randomBytes } from "node:crypto";
import { config } from "../config.js";
import { TELEGRAM_START_PREFIX } from "../constants/telegram.js";
import { getStore } from "../db/index.js";
import { ClassificationSource, TxType } from "../enums/index.js";
import { AppError } from "../errors/AppError.js";
import {
  CATEGORY_PROMPT_LIST,
  formatSpendPrompt,
  parseCategoryReply,
} from "./categories.js";
import {
  sendTelegramMessage,
  type TelegramSender,
  type TelegramUpdate,
} from "./client.js";

export type TelegramStatus = {
  configured: boolean;
  linked: boolean;
  botUsername: string | null;
  deepLink?: string | null;
  startCommand?: string | null;
};

export function generateTelegramLinkToken(): string {
  return `${TELEGRAM_START_PREFIX}${randomBytes(16).toString("hex")}`;
}

export function buildTelegramDeepLink(
  username: string,
  token: string,
): string | null {
  if (!username) return null;
  return `https://t.me/${username}?start=${token}`;
}

export function parseStartCommand(text: string): {
  matched: boolean;
  token: string | null;
} {
  const match = text
    .trim()
    .match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?$/i);
  if (!match) return { matched: false, token: null };
  return { matched: true, token: match[1] ?? null };
}

export function telegramWebhookSecretMatches(
  header: string | undefined,
): boolean {
  const expected = config.telegram.webhookSecret;
  if (!expected) return true;
  return header === expected;
}

function publicStatus(
  linked: boolean,
  extras: Pick<TelegramStatus, "deepLink" | "startCommand"> = {},
): TelegramStatus {
  return {
    configured: config.telegram.enabled,
    linked,
    botUsername: config.telegram.botUsername || null,
    ...extras,
  };
}

export async function getTelegramStatus(userId: string): Promise<TelegramStatus> {
  const store = await getStore();
  const user = await store.findUserById(userId);
  if (!user) throw AppError.notFound("User not found");
  return publicStatus(Boolean(user.telegramChatId));
}

export async function createTelegramLink(userId: string): Promise<TelegramStatus> {
  if (!config.telegram.enabled) {
    throw AppError.serviceUnavailable("Telegram is not configured");
  }
  const store = await getStore();
  const user = await store.findUserById(userId);
  if (!user) throw AppError.notFound("User not found");
  if (user.telegramChatId) {
    return publicStatus(true);
  }
  const token = generateTelegramLinkToken();
  await store.setTelegramLinkToken(userId, token);
  await store.audit(userId, "telegram.link_created", {});
  return publicStatus(false, {
    deepLink: buildTelegramDeepLink(config.telegram.botUsername, token),
    startCommand: `/start ${token}`,
  });
}

export async function unlinkTelegramAccount(
  userId: string,
): Promise<TelegramStatus> {
  const store = await getStore();
  await store.unlinkTelegram(userId);
  await store.audit(userId, "telegram.unlinked", { source: "settings" });
  return publicStatus(false);
}

async function sendNextPrompt(
  chatId: string,
  userId: string,
  send: TelegramSender,
): Promise<void> {
  const store = await getStore();
  for (let i = 0; i < 20; i += 1) {
    const next = await store.getOldestPendingTelegramPrompt(chatId);
    if (!next) return;
    const tx = await store.getTransaction(userId, next.transactionId);
    if (!tx) {
      await store.expireTelegramPrompt(next.id);
      continue;
    }
    await send(
      chatId,
      formatSpendPrompt({
        amount: tx.amount,
        date: tx.date,
        description: tx.description,
      }),
    );
    return;
  }
}

async function handleStart(
  chatId: string,
  token: string | null,
  send: TelegramSender,
): Promise<void> {
  if (!token) {
    await send(
      chatId,
      "Open Settings in Ledgerline and tap Connect Telegram.",
    );
    return;
  }
  const store = await getStore();
  const user = await store.findUserByTelegramLinkToken(token);
  if (!user) {
    await send(chatId, "That link expired. Generate a new one in Settings.");
    return;
  }
  const taken = await store.findUserByTelegramChatId(chatId);
  if (taken && taken.id !== user.id) {
    await send(
      chatId,
      "This Telegram is already linked to another Ledgerline account.",
    );
    return;
  }
  await store.linkTelegramChat(user.id, chatId);
  await store.audit(user.id, "telegram.linked", {});
  await send(
    chatId,
    "Connected. I'll ask for a category when a new spend shows up in mail.",
  );
}

async function handleUnlinkCommand(
  chatId: string,
  send: TelegramSender,
): Promise<void> {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(chatId, "This chat is not linked.");
    return;
  }
  await store.unlinkTelegram(user.id);
  await store.audit(user.id, "telegram.unlinked", { source: "chat" });
  await send(chatId, "Disconnected. You can reconnect from Settings.");
}

async function handleCategoryReply(
  chatId: string,
  text: string,
  send: TelegramSender,
): Promise<void> {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(
      chatId,
      "This chat is not linked. Open Settings and tap Connect Telegram.",
    );
    return;
  }
  const prompt = await store.getOldestPendingTelegramPrompt(chatId);
  if (!prompt) {
    await send(chatId, "No spend waiting for a category.");
    return;
  }
  const slug = parseCategoryReply(text);
  if (!slug) {
    await send(
      chatId,
      `Didn't catch that. Reply with one of: ${CATEGORY_PROMPT_LIST}.`,
    );
    return;
  }
  await store.updateTransaction(user.id, prompt.transactionId, {
    categorySlug: slug,
    classificationSource: ClassificationSource.Telegram,
  });
  await store.answerTelegramPrompt(prompt.id, slug);
  await store.audit(user.id, "telegram.categorized", {
    transactionId: prompt.transactionId,
    categorySlug: slug,
  });
  await send(chatId, `Saved as ${slug}.`);
  await sendNextPrompt(chatId, user.id, send);
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  send: TelegramSender = sendTelegramMessage,
): Promise<void> {
  const message = update.message;
  if (!message?.text || message.chat.type !== "private") return;
  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const start = parseStartCommand(text);
  if (start.matched) {
    await handleStart(chatId, start.token, send);
    return;
  }
  if (/^\/unlink\b/i.test(text)) {
    await handleUnlinkCommand(chatId, send);
    return;
  }
  if (/^\/help\b/i.test(text)) {
    await send(
      chatId,
      `Reply with one of: ${CATEGORY_PROMPT_LIST}.`,
    );
    return;
  }
  await handleCategoryReply(chatId, text, send);
}

export async function notifyMailDebits(
  userId: string,
  transactionIds: string[],
  send: TelegramSender = sendTelegramMessage,
): Promise<number> {
  if (transactionIds.length === 0) return 0;
  if (!config.telegram.enabled && send === sendTelegramMessage) return 0;
  const store = await getStore();
  const user = await store.findUserById(userId);
  if (!user?.telegramChatId) return 0;
  const chatId = user.telegramChatId;
  const alreadyPending = await store.getOldestPendingTelegramPrompt(chatId);
  let created = 0;
  for (const id of transactionIds) {
    const tx = await store.getTransaction(userId, id);
    if (!tx || tx.type !== TxType.Debit) continue;
    await store.createTelegramPrompt({
      userId,
      transactionId: id,
      chatId,
    });
    created += 1;
  }
  if (!alreadyPending && created > 0) {
    await sendNextPrompt(chatId, userId, send);
  }
  return created;
}
