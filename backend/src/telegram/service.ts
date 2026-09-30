import { randomBytes } from "node:crypto";
import { config } from "../config.js";
import { TELEGRAM_START_PREFIX } from "../constants/telegram.js";
import { getStore } from "../db/index.js";
import { BACKFILL_DEFAULT_MAX_MESSAGES } from "../constants/index.js";
import { ClassificationSource, ImportSource, TxType } from "../enums/index.js";
import { processPdfImport } from "../imports/service.js";
import { enablePoolingForUser, getGmailConnectUrl } from "../gmail/service.js";
import { AppError } from "../errors/AppError.js";
import { formatSpendPrompt, parseCategoryReply } from "./categories.js";
import { formatReminderClock, parseTelegramCommand } from "./commands.js";
import {
  formatCategorySpend,
  formatMonth,
  formatStatus,
  formatToday,
  istClock,
  limitCrossingLine,
  loadSpendSnapshot,
} from "./briefing.js";
import {
  answerTelegramCallback,
  clearTelegramReplyKeyboard,
  downloadTelegramFile,
  sendTelegramMessage,
  type TelegramCallbackQuery,
  type TelegramSender,
  type TelegramUpdate,
} from "./client.js";
import {
  categoryKeyboard,
  homeKeyboard,
  limitKeyboard,
  parseTelegramAction,
  remindKeyboard,
  type InlineKeyboard,
} from "./ui.js";

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
    const snapshot = await loadSpendSnapshot(userId).catch(() => null);
    await send(
      chatId,
      formatSpendPrompt({
        amount: tx.amount,
        date: tx.date,
        description: tx.description,
        note: snapshot ? limitCrossingLine(snapshot) : null,
      }),
      { keyboard: categoryKeyboard() },
    );
    return;
  }
}

async function handleStart(
  chatId: string,
  token: string | null,
  send: TelegramSender,
): Promise<void> {
  if (send === sendTelegramMessage) await clearTelegramReplyKeyboard(chatId);
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
  await send(chatId, "Connected. This chat is only your Ledgerline account.", {
    keyboard: homeKeyboard(),
  });
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
    await send(chatId, "Tap the category.", { keyboard: categoryKeyboard() });
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
  await send(chatId, `Saved as ${slug}.`, { keyboard: homeKeyboard() });
  await sendNextPrompt(chatId, user.id, send);
}

async function applyCategory(chatId: string, slug: string, send: TelegramSender): Promise<void> {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(chatId, "This chat is not linked. Open Settings and tap Connect Telegram.");
    return;
  }
  const prompt = await store.getOldestPendingTelegramPrompt(chatId);
  if (!prompt) {
    await send(chatId, await formatCategorySpend(user.id, slug), { keyboard: homeKeyboard() });
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
  const label = slug;
  await send(chatId, `Saved as ${label}.`, { keyboard: homeKeyboard() });
  await sendNextPrompt(chatId, user.id, send);
}

async function handleCallback(query: TelegramCallbackQuery, send: TelegramSender): Promise<void> {
  if (send === sendTelegramMessage) await answerTelegramCallback(query.id);
  const chatId = String(query.message?.chat.id ?? query.from.id);
  if (query.message && query.message.chat.type !== "private") return;
  const action = parseTelegramAction(query.data ?? "");
  if (!action) {
    await send(chatId, "That button expired.", { keyboard: homeKeyboard() });
    return;
  }
  await handleAction(chatId, action, send);
}

async function handleAction(
  chatId: string,
  action: NonNullable<ReturnType<typeof parseTelegramAction>>,
  send: TelegramSender,
): Promise<void> {
  if (action.kind === "home") {
    await send(chatId, "Your account.", { keyboard: homeKeyboard() });
    return;
  }
  if (action.kind === "spent-menu") {
    await send(chatId, "Which category?", { keyboard: categoryKeyboard() });
    return;
  }
  if (action.kind === "limit-menu") {
    await send(chatId, "Daily limit.", { keyboard: limitKeyboard() });
    return;
  }
  if (action.kind === "remind-menu") {
    await send(chatId, "Daily note, India time.", { keyboard: remindKeyboard() });
    return;
  }
  if (action.kind === "statement") {
    await send(chatId, "Send the PDF here. Put the password in the caption, or reply with it next.", {
      keyboard: homeKeyboard(),
    });
    return;
  }
  if (action.kind === "unlink") {
    await handleUnlinkCommand(chatId, send);
    return;
  }
  if (action.kind === "category") {
    await applyCategory(chatId, action.slug, send);
    return;
  }
  const user = await requireLinked(chatId, send);
  if (!user) return;
  const store = await getStore();
  if (action.kind === "set-limit") {
    await store.updateUserPreferences(user.id, { dailySpendLimit: action.amount });
    await send(
      chatId,
      action.amount == null
        ? "Daily limit cleared."
        : `Daily limit set to ₹${action.amount.toLocaleString("en-IN")}.`,
      { keyboard: homeKeyboard() },
    );
    return;
  }
  if (action.kind === "set-remind") {
    await store.setTelegramReminder(user.id, action.minute);
    await send(
      chatId,
      action.minute == null
        ? "Daily reminder off."
        : `I'll send a status every day at ${formatReminderClock(action.minute)} IST.`,
      { keyboard: homeKeyboard() },
    );
    return;
  }
  if (action.kind === "scan") {
    await send(chatId, await startMailScan(user.id, ""), { keyboard: homeKeyboard() });
    return;
  }
  if (action.kind === "gmail") {
    try {
      const { url } = getGmailConnectUrl(user.id);
      await send(chatId, `Connect email for your account. This link expires in 10 minutes.\n${url}`, {
        keyboard: homeKeyboard(),
      });
    } catch (error) {
      await send(chatId, error instanceof Error ? error.message : "Email connect is not available.", {
        keyboard: homeKeyboard(),
      });
    }
    return;
  }
  const snapshot = await loadSpendSnapshot(user.id);
  const text =
    action.kind === "today"
      ? formatToday(snapshot)
      : action.kind === "month"
        ? formatMonth(snapshot)
        : formatStatus(snapshot);
  await send(chatId, text, { keyboard: homeKeyboard() });
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  send: TelegramSender = sendTelegramMessage,
  fetchFile: (fileId: string) => Promise<Buffer> = downloadTelegramFile,
): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update.callback_query, send);
    return;
  }
  const message = update.message;
  if (!message || message.chat.type !== "private") return;
  const chatId = String(message.chat.id);
  if (message.document) {
    await handleStatementDocument(chatId, message.document, message.caption ?? "", send, fetchFile);
    return;
  }
  if (!message.text) return;
  const text = message.text.trim();
  const button = text.toLowerCase();
  const fromOldKeypad =
    button === "scan mail" ||
    button === "status" ||
    button === "connect email" ||
    button === "today";
  if (fromOldKeypad && send === sendTelegramMessage) {
    await clearTelegramReplyKeyboard(chatId);
  }
  const asCommand =
    button === "scan mail"
      ? "/scan"
      : button === "status"
        ? "/status"
        : button === "connect email"
          ? "/gmail"
          : button === "today"
            ? "/today"
            : text;
  const start = parseStartCommand(asCommand);
  if (start.matched) {
    await handleStart(chatId, start.token, send);
    return;
  }
  if (/^\/unlink\b/i.test(text)) {
    await handleUnlinkCommand(chatId, send);
    return;
  }
  const command = parseTelegramCommand(asCommand);
  if (command) {
    await handleCommand(chatId, command, send);
    return;
  }
  const store = await getStore();
  const linked = await store.findUserByTelegramChatId(chatId);
  if (linked?.telegramPendingFileId) {
    await importPendingStatement(linked.id, chatId, text, send, fetchFile);
    return;
  }
  await handleCategoryReply(chatId, text, send);
}

function isPdf(fileName: string | undefined, mime: string | undefined): boolean {
  return Boolean(mime?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf"));
}

async function handleStatementDocument(
  chatId: string,
  document: { file_id: string; file_name?: string; mime_type?: string },
  caption: string,
  send: TelegramSender,
  fetchFile: (fileId: string) => Promise<Buffer>,
): Promise<void> {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(chatId, "This chat is not linked. Open Settings and tap Connect Telegram.");
    return;
  }
  if (!isPdf(document.file_name, document.mime_type)) {
    await send(chatId, "Send the statement as a PDF.");
    return;
  }
  const password = caption.trim();
  if (!password) {
    await store.setTelegramPendingFile(user.id, {
      fileId: document.file_id,
      fileName: document.file_name?.trim() || "statement.pdf",
    });
    await send(chatId, "Got the PDF. Reply with the statement password.", { keyboard: homeKeyboard() });
    return;
  }
  await importStatementFile(
    user.id,
    chatId,
    document.file_id,
    document.file_name?.trim() || "statement.pdf",
    password,
    send,
    fetchFile,
  );
}

async function importPendingStatement(
  userId: string,
  chatId: string,
  password: string,
  send: TelegramSender,
  fetchFile: (fileId: string) => Promise<Buffer>,
): Promise<void> {
  const store = await getStore();
  const user = await store.findUserById(userId);
  const fileId = user?.telegramPendingFileId;
  const fileName = user?.telegramPendingFileName || "statement.pdf";
  if (!fileId) {
    await handleCategoryReply(chatId, password, send);
    return;
  }
  await importStatementFile(userId, chatId, fileId, fileName, password, send, fetchFile);
}

async function importStatementFile(
  userId: string,
  chatId: string,
  fileId: string,
  fileName: string,
  password: string,
  send: TelegramSender,
  fetchFile: (fileId: string) => Promise<Buffer>,
): Promise<void> {
  const store = await getStore();
  try {
    const buffer = await fetchFile(fileId);
    const result = await processPdfImport({
      userId,
      buffer,
      filename: fileName,
      password,
      source: ImportSource.Upload,
    });
    await store.setTelegramPendingFile(userId, null);
    await send(
      chatId,
      `Imported ${result.inserted} new row${result.inserted === 1 ? "" : "s"} from ${fileName}. ${Math.round(result.result.summary.totalSpent).toLocaleString("en-IN")} spent in that statement.`,
      { keyboard: homeKeyboard() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import that statement.";
    await send(chatId, message.slice(0, 300), { keyboard: homeKeyboard() });
  }
}

async function startMailScan(userId: string, password: string): Promise<string> {
  const store = await getStore();
  const connection = await store.getGmailConnection(userId);
  if (!connection || connection.disconnectedAt) {
    return "Connect email first. Tap Connect email or send /gmail.";
  }
  if ((await store.listAccounts(userId)).length === 0) {
    await store.getOrCreateAccount(userId, "hdfc");
  }
  try {
    await enablePoolingForUser(userId, {
      password,
      maxMessages: BACKFILL_DEFAULT_MAX_MESSAGES,
    });
  } catch (error) {
    return error instanceof Error ? error.message : "Could not start the mail scan.";
  }
  return "Scanning bank mail for your account. New spends will ask for a category. Send /status for the totals.";
}

async function requireLinked(chatId: string, send: TelegramSender) {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(chatId, "This chat is not linked. Open Settings and tap Connect Telegram.");
    return null;
  }
  return user;
}

async function handleCommand(
  chatId: string,
  command: NonNullable<ReturnType<typeof parseTelegramCommand>>,
  send: TelegramSender,
): Promise<void> {
  if (command.kind === "help") {
    await send(chatId, "Tap a button. This chat only sees your account.", { keyboard: homeKeyboard() });
    return;
  }
  if (command.kind === "unlink") {
    await handleUnlinkCommand(chatId, send);
    return;
  }
  if (command.kind === "statement") {
    await send(chatId, "Send the PDF here. Put the password in the caption, or reply with the password next.", {
      keyboard: homeKeyboard(),
    });
    return;
  }
  if (command.kind === "scan") {
    const user = await requireLinked(chatId, send);
    if (!user) return;
    await send(chatId, await startMailScan(user.id, command.password), { keyboard: homeKeyboard() });
    return;
  }
  if (command.kind === "gmail") {
    const user = await requireLinked(chatId, send);
    if (!user) return;
    try {
      const { url } = getGmailConnectUrl(user.id);
      await send(chatId, `Connect email for your account. This link expires in 10 minutes.\n${url}`, {
        keyboard: homeKeyboard(),
      });
    } catch (error) {
      await send(chatId, error instanceof Error ? error.message : "Email connect is not available.", {
        keyboard: homeKeyboard(),
      });
    }
    return;
  }
  if (command.kind === "unknown") {
    await send(chatId, "Tap a button.", { keyboard: homeKeyboard() });
    return;
  }
  const user = await requireLinked(chatId, send);
  if (!user) return;
  const store = await getStore();
  if (command.kind === "limit") {
    if (!command.valid) {
      await send(chatId, "Pick a limit.", { keyboard: limitKeyboard() });
      return;
    }
    await store.updateUserPreferences(user.id, { dailySpendLimit: command.amount });
    await send(
      chatId,
      command.amount == null
        ? "Daily limit cleared."
        : `Daily limit set to ₹${command.amount.toLocaleString("en-IN")}.`,
      { keyboard: homeKeyboard() },
    );
    return;
  }
  if (command.kind === "remind") {
    if (!command.valid) {
      await send(chatId, "Pick a time.", { keyboard: remindKeyboard() });
      return;
    }
    await store.setTelegramReminder(user.id, command.minute);
    await send(
      chatId,
      command.minute == null
        ? "Daily reminder off."
        : `I'll send a status every day at ${formatReminderClock(command.minute)} IST.`,
      { keyboard: homeKeyboard() },
    );
    return;
  }
  if (command.kind === "spent") {
    await send(chatId, await formatCategorySpend(user.id, command.category), { keyboard: homeKeyboard() });
    return;
  }
  const snapshot = await loadSpendSnapshot(user.id);
  if (command.kind === "today") {
    await send(chatId, formatToday(snapshot), { keyboard: homeKeyboard() });
    return;
  }
  if (command.kind === "month") {
    await send(chatId, formatMonth(snapshot), { keyboard: homeKeyboard() });
    return;
  }
  await send(chatId, formatStatus(snapshot), { keyboard: homeKeyboard() });
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

/** One status note per linked chat, after the chosen IST time, once a day. */
export async function sendDueTelegramReminders(
  now = new Date(),
  send: TelegramSender = sendTelegramMessage,
): Promise<number> {
  if (!config.telegram.enabled && send === sendTelegramMessage) return 0;
  const store = await getStore();
  const clock = istClock(now);
  const users = await store.listTelegramReminderUsers();
  let sent = 0;
  for (const user of users) {
    if (!user.telegramChatId || user.telegramRemindMinute == null) continue;
    if (clock.minutes < user.telegramRemindMinute) continue;
    if (user.telegramRemindedOn === clock.date) continue;
    const snapshot = await loadSpendSnapshot(user.id, now);
    await send(user.telegramChatId, formatStatus(snapshot), { keyboard: homeKeyboard() });
    await store.markTelegramReminded(user.id, clock.date);
    sent += 1;
  }
  return sent;
}
