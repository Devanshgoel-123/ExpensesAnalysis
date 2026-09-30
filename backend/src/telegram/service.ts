import { randomBytes } from "node:crypto";
import { config } from "../config.js";
import { TELEGRAM_START_PREFIX } from "../constants/telegram.js";
import { getStore } from "../db/index.js";
import { BACKFILL_DEFAULT_MAX_MESSAGES } from "../constants/index.js";
import { ClassificationSource, ImportSource, TxType } from "../enums/index.js";
import { processPdfImport } from "../imports/service.js";
import { enablePoolingForUser, getGmailConnectUrl, syncGmailForUser } from "../gmail/service.js";
import { AppError } from "../errors/AppError.js";
import { logger } from "../logger/index.js";
import { parseCategoryReply } from "./categories.js";
import { formatReminderClock, parseTelegramCommand } from "./commands.js";
import {
  formatCategorySpend,
  formatMonth,
  formatStatus,
  formatToday,
  istClock,
  loadSpendSnapshot,
} from "./briefing.js";
import {
  askChoices,
  categoryAskDue,
  categoryGap,
  categoryLabel,
  formatCategoryAsk,
  hasChildCategories,
  isQuietHours,
  paymentTitle,
  toCatalog,
  type CatalogCategory,
} from "./labels.js";
import {
  answerTelegramCallback,
  clearTelegramChat,
  clearTelegramReplyKeyboard,
  downloadTelegramFile,
  registerTelegramCommands,
  sendTelegramMessage,
  type TelegramCallbackQuery,
  type TelegramChatClearer,
  type TelegramSender,
  type TelegramUpdate,
} from "./client.js";
import {
  categoryIcon,
  categoryKeyboard,
  choiceKeyboard,
  clearConfirmKeyboard,
  esc,
  homeKeyboard,
  limitKeyboard,
  linkKeyboard,
  parseTelegramAction,
  remindKeyboard,
} from "./ui.js";
import { TELEGRAM_DELETE_WINDOW_HOURS } from "../constants/telegram.js";

const NOT_LINKED = "🔗 This chat is not linked. Open Settings in Ledgerline and tap Connect Telegram.";

const CLEAR_PROMPT = [
  "🧹 <b>Clear this chat?</b>",
  "",
  `This removes the messages here from the last ${TELEGRAM_DELETE_WINDOW_HOURS} hours.`,
  "✅ Your expenses, labels and settings stay saved in Ledgerline.",
  "",
  "<i>Telegram does not let bots delete older messages. For those, open the chat menu ⋮ and tap Clear history.</i>",
].join("\n");

const CLEARED =
  "🧹 <b>Chat cleared.</b>\nYour expenses, labels and settings are all still saved in Ledgerline.";

function gmailLinkMessage(url: string): { text: string; keyboard: ReturnType<typeof linkKeyboard> } {
  return {
    text: "📧 <b>Connect email</b>\nSign in with Google to read your bank alerts. The link expires in 10 minutes.",
    keyboard: linkKeyboard("🔗 Open Google sign-in", url),
  };
}

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

async function catalogFor(userId: string): Promise<CatalogCategory[]> {
  const store = await getStore();
  return toCatalog(await store.listCategories(userId));
}

async function currentAsk(userId: string, chatId: string) {
  const store = await getStore();
  const catalog = await catalogFor(userId);
  const open = (await store.listTransactions(userId))
    .filter((row) => categoryGap(row.categorySlug, catalog))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const tx = open[0];
  const gap = tx ? categoryGap(tx.categorySlug, catalog) : null;
  if (!tx || !gap) return null;
  let prompt = await store.createTelegramPrompt({
    userId,
    transactionId: tx.id,
    chatId,
  });
  if (prompt.status !== "pending") {
    const reopened = await store.reopenTelegramPrompt(prompt.id);
    if (reopened) prompt = reopened;
  }
  return { catalog, tx, gap, prompt, remaining: open.length };
}

async function sendNextPrompt(
  chatId: string,
  userId: string,
  send: TelegramSender,
): Promise<boolean> {
  const ask = await currentAsk(userId, chatId);
  if (!ask) return false;
  await send(
    chatId,
    formatCategoryAsk({
      amount: ask.tx.amount,
      date: ask.tx.date,
      title: paymentTitle(ask.tx),
      gap: ask.gap,
      remaining: ask.remaining,
    }),
    { keyboard: choiceKeyboard(askChoices(ask.gap, ask.catalog)) },
  );
  return true;
}

async function handleStart(
  chatId: string,
  token: string | null,
  send: TelegramSender,
): Promise<void> {
  if (send === sendTelegramMessage) await clearTelegramReplyKeyboard(chatId);
  if (!token) {
    await send(chatId, "👋 Open Settings in Ledgerline and tap Connect Telegram.");
    return;
  }
  const store = await getStore();
  const user = await store.findUserByTelegramLinkToken(token);
  if (!user) {
    await send(chatId, "⌛ That link expired. Generate a new one in Settings.");
    return;
  }
  const taken = await store.findUserByTelegramChatId(chatId);
  if (taken && taken.id !== user.id) {
    await send(chatId, "⚠️ This Telegram is already linked to another Ledgerline account.");
    return;
  }
  await store.linkTelegramChat(user.id, chatId);
  await store.audit(user.id, "telegram.linked", {});
  await send(
    chatId,
    "🎉 <b>Connected to Ledgerline</b>\nThis chat only sees your account. I'll ask about new payments and send your daily status here.",
    { keyboard: homeKeyboard() },
  );
}

async function handleUnlinkCommand(
  chatId: string,
  send: TelegramSender,
): Promise<void> {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(chatId, NOT_LINKED);
    return;
  }
  await store.unlinkTelegram(user.id);
  await store.audit(user.id, "telegram.unlinked", { source: "chat" });
  await send(chatId, "🔌 <b>Disconnected.</b> You can reconnect from Settings.");
}

async function handleClear(
  chatId: string,
  messageId: number | undefined,
  send: TelegramSender,
  clearChat: TelegramChatClearer,
): Promise<void> {
  const user = await requireLinked(chatId, send);
  if (!user) return;
  if (messageId) await clearChat(chatId, messageId);
  const store = await getStore();
  await store.audit(user.id, "telegram.chat_cleared", {});
  await send(chatId, CLEARED, { keyboard: homeKeyboard() });
}

async function handleCategoryReply(
  chatId: string,
  text: string,
  send: TelegramSender,
): Promise<void> {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(chatId, NOT_LINKED);
    return;
  }
  const ask = await currentAsk(user.id, chatId);
  if (!ask) {
    await send(chatId, "✨ All caught up. No payment is waiting for a category.", {
      keyboard: homeKeyboard(),
    });
    return;
  }
  const prompt = ask.prompt;
  const slug = parseCategoryReply(text);
  if (!slug) {
    await sendNextPrompt(chatId, user.id, send);
    return;
  }
  await saveCategoryChoice(chatId, user.id, prompt.id, prompt.transactionId, slug, send);
}

async function applyCategory(chatId: string, slug: string, send: TelegramSender): Promise<void> {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(chatId, NOT_LINKED);
    return;
  }
  const ask = await currentAsk(user.id, chatId);
  if (!ask) {
    await send(chatId, await formatCategorySpend(user.id, slug), { keyboard: homeKeyboard() });
    return;
  }
  const prompt = ask.prompt;
  await saveCategoryChoice(chatId, user.id, prompt.id, prompt.transactionId, slug, send);
}

async function saveCategoryChoice(
  chatId: string,
  userId: string,
  promptId: string,
  transactionId: string,
  slug: string,
  send: TelegramSender,
): Promise<void> {
  const store = await getStore();
  const catalog = await catalogFor(userId);
  await store.updateTransaction(userId, transactionId, {
    categorySlug: slug,
    classificationSource: ClassificationSource.Telegram,
  });
  await store.audit(userId, "telegram.categorized", {
    transactionId,
    categorySlug: slug,
  });
  if (hasChildCategories(slug, catalog)) {
    await sendNextPrompt(chatId, userId, send);
    return;
  }
  await store.answerTelegramPrompt(promptId, slug);
  await send(chatId, `✅ <b>Saved as ${esc(categoryLabel(catalog, slug))}</b> ${categoryIcon(slug)}`, {
    keyboard: homeKeyboard(),
  });
  await sendNextPrompt(chatId, userId, send);
}

async function handleCallback(
  query: TelegramCallbackQuery,
  send: TelegramSender,
  clearChat: TelegramChatClearer,
): Promise<void> {
  if (send === sendTelegramMessage) await answerTelegramCallback(query.id);
  const chatId = String(query.message?.chat.id ?? query.from.id);
  if (query.message && query.message.chat.type !== "private") return;
  const action = parseTelegramAction(query.data ?? "");
  if (!action) {
    await send(chatId, "⌛ That button expired.", { keyboard: homeKeyboard() });
    return;
  }
  if (action.kind === "clear") {
    await handleClear(chatId, query.message?.message_id, send, clearChat);
    return;
  }
  await handleAction(chatId, action, send);
}

const STATEMENT_HINT =
  "📄 <b>Send a statement</b>\nAttach the PDF here. Put the password in the caption, or reply with it next.";

async function handleAction(
  chatId: string,
  action: Exclude<NonNullable<ReturnType<typeof parseTelegramAction>>, { kind: "clear" }>,
  send: TelegramSender,
): Promise<void> {
  if (action.kind === "home") {
    await send(chatId, "🏠 <b>Ledgerline</b>\nWhat would you like to see?", { keyboard: homeKeyboard() });
    return;
  }
  if (action.kind === "spent-menu") {
    await send(chatId, "🏷 <b>Which category?</b>\nI'll show what you spent on it this month.", {
      keyboard: categoryKeyboard(),
    });
    return;
  }
  if (action.kind === "limit-menu") {
    await send(chatId, "🎯 <b>Daily limit</b>\nI'll warn you when a day goes over it.", {
      keyboard: limitKeyboard(),
    });
    return;
  }
  if (action.kind === "remind-menu") {
    await send(chatId, "⏰ <b>Daily status</b>\nPick a time, India time.", { keyboard: remindKeyboard() });
    return;
  }
  if (action.kind === "statement") {
    await send(chatId, STATEMENT_HINT, { keyboard: homeKeyboard() });
    return;
  }
  if (action.kind === "clear-menu") {
    await send(chatId, CLEAR_PROMPT, { keyboard: clearConfirmKeyboard() });
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
    await send(chatId, limitSetText(action.amount), { keyboard: homeKeyboard() });
    return;
  }
  if (action.kind === "set-remind") {
    await store.setTelegramReminder(user.id, action.minute);
    await send(chatId, remindSetText(action.minute), { keyboard: homeKeyboard() });
    return;
  }
  if (action.kind === "scan" || action.kind === "sync") {
    await runGmailSync(chatId, user.id, "", send);
    return;
  }
  if (action.kind === "gmail") {
    await sendGmailLink(chatId, user.id, send);
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

function limitSetText(amount: number | null): string {
  return amount == null
    ? "🚫 Daily limit cleared."
    : `🎯 Daily limit set to <b>₹${amount.toLocaleString("en-IN")}</b>.`;
}

function remindSetText(minute: number | null): string {
  return minute == null
    ? "🔕 Daily reminder off."
    : `⏰ I'll send your status every day at <b>${formatReminderClock(minute)}</b> IST.`;
}

function errorText(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  return `⚠️ ${esc(message.slice(0, 300))}`;
}

async function sendGmailLink(chatId: string, userId: string, send: TelegramSender): Promise<void> {
  try {
    const { url } = getGmailConnectUrl(userId);
    const link = gmailLinkMessage(url);
    await send(chatId, link.text, { keyboard: link.keyboard });
  } catch (error) {
    await send(chatId, errorText(error, "Email connect is not available."), { keyboard: homeKeyboard() });
  }
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  send: TelegramSender = sendTelegramMessage,
  fetchFile: (fileId: string) => Promise<Buffer> = downloadTelegramFile,
  clearChat: TelegramChatClearer = clearTelegramChat,
): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update.callback_query, send, clearChat);
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
    await send(chatId, NOT_LINKED);
    return;
  }
  if (!isPdf(document.file_name, document.mime_type)) {
    await send(chatId, "📄 Send the statement as a PDF.");
    return;
  }
  const password = caption.trim();
  if (!password) {
    await store.setTelegramPendingFile(user.id, {
      fileId: document.file_id,
      fileName: document.file_name?.trim() || "statement.pdf",
    });
    await send(chatId, "📥 <b>Got the PDF.</b>\n🔑 Reply with the statement password.", {
      keyboard: homeKeyboard(),
    });
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
      [
        "📄 <b>Statement imported</b>",
        esc(fileName),
        "",
        `🆕 ${result.inserted} new row${result.inserted === 1 ? "" : "s"}`,
        `🔻 ₹${Math.round(result.result.summary.totalSpent).toLocaleString("en-IN")} spent in that statement`,
      ].join("\n"),
      { keyboard: homeKeyboard() },
    );
  } catch (error) {
    await send(chatId, errorText(error, "Could not import that statement."), { keyboard: homeKeyboard() });
  }
}

async function runGmailSync(
  chatId: string,
  userId: string,
  password: string,
  send: TelegramSender,
): Promise<void> {
  const store = await getStore();
  const connection = await store.getGmailConnection(userId);
  if (!connection || connection.disconnectedAt) {
    await send(chatId, "📧 Connect email first. Tap 📧 Connect email below.", { keyboard: homeKeyboard() });
    return;
  }
  if ((await store.listAccounts(userId)).length === 0) {
    await store.getOrCreateAccount(userId, "hdfc");
  }
  const pooling = (await store.listAccounts(userId)).some((account) => account.poolingEnabled);
  let summary: string;
  try {
    if (!pooling || password) {
      await enablePoolingForUser(userId, {
        password,
        maxMessages: BACKFILL_DEFAULT_MAX_MESSAGES,
      });
      summary = "🔄 <b>Gmail sync started.</b>";
    } else {
      const result = await syncGmailForUser(userId);
      if (result.run.busy) {
        await send(chatId, "⏳ A Gmail sync is already running.", { keyboard: homeKeyboard() });
        return;
      }
      const imported = result.run.imported;
      summary =
        imported === 0
          ? "✅ <b>Gmail synced.</b> No new mail."
          : `✅ <b>Gmail synced.</b> ${imported} new message${imported === 1 ? "" : "s"}.`;
    }
  } catch (error) {
    await send(chatId, errorText(error, "Could not sync Gmail."), { keyboard: homeKeyboard() });
    return;
  }
  const clock = istClock(new Date());
  if (isQuietHours(clock.minutes)) {
    await send(chatId, `${summary}\n\n🌙 I'll ask about unlabeled payments after 10:00.`, {
      keyboard: homeKeyboard(),
    });
    return;
  }
  await send(chatId, summary, { keyboard: homeKeyboard() });
  const asked = await sendNextPrompt(chatId, userId, send);
  if (asked) await store.markTelegramCategoryPinged(userId, new Date().toISOString());
}

async function requireLinked(chatId: string, send: TelegramSender) {
  const store = await getStore();
  const user = await store.findUserByTelegramChatId(chatId);
  if (!user) {
    await send(chatId, NOT_LINKED);
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
  if (command.kind === "sync") {
    const user = await requireLinked(chatId, send);
    if (!user) return;
    await runGmailSync(chatId, user.id, command.password, send);
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
  const catalog = await catalogFor(userId);
  let created = 0;
  for (const id of transactionIds) {
    const tx = await store.getTransaction(userId, id);
    if (!tx || (tx.type !== TxType.Debit && tx.type !== TxType.Credit)) continue;
    if (!categoryGap(tx.categorySlug, catalog)) continue;
    const prompt = await store.createTelegramPrompt({
      userId,
      transactionId: id,
      chatId,
    });
    if (prompt.status === "expired") await store.reopenTelegramPrompt(prompt.id);
    created += 1;
  }
  void send;
  return created;
}

/** Ask each linked chat about unlabeled payments, at most once every six hours, never 02:00–10:00 IST. */
export async function sendDueCategoryPrompts(
  now = new Date(),
  send: TelegramSender = sendTelegramMessage,
): Promise<number> {
  if (!config.telegram.enabled && send === sendTelegramMessage) return 0;
  const clock = istClock(now);
  if (isQuietHours(clock.minutes)) return 0;
  const store = await getStore();
  const users = await store.listTelegramLinkedUsers();
  let sent = 0;
  for (const user of users) {
    if (!user.telegramChatId) continue;
    if (!categoryAskDue(user.telegramCategoryPingedAt, now, clock.minutes)) continue;
    await store.markTelegramCategoryPinged(user.id, now.toISOString());
    const asked = await sendNextPrompt(user.telegramChatId, user.id, send);
    if (asked) sent += 1;
  }
  return sent;
}

/** One status note per linked chat, after the chosen IST time, once a day. */
export async function sendDueTelegramReminders(
  now = new Date(),
  send: TelegramSender = sendTelegramMessage,
): Promise<number> {
  if (!config.telegram.enabled && send === sendTelegramMessage) return 0;
  const store = await getStore();
  const clock = istClock(now);
  if (isQuietHours(clock.minutes)) return 0;
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

/** Register slash commands and check for category asks every 15 minutes. */
export function startTelegramSchedules(): void {
  if (!config.telegram.enabled) return;
  void registerTelegramCommands();
  const tick = () => {
    void sendDueCategoryPrompts().catch((error: unknown) => {
      logger.warn({ err: error }, "telegram category ask failed");
    });
  };
  setTimeout(tick, 20_000).unref?.();
  setInterval(tick, 15 * 60 * 1000).unref?.();
}
