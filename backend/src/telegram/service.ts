import { randomBytes } from "node:crypto";
import { config } from "../config.js";
import { TELEGRAM_START_PREFIX } from "../constants/telegram.js";
import { getStore } from "../db/index.js";
import { BACKFILL_DEFAULT_MAX_MESSAGES } from "../constants/index.js";
import { ClassificationSource, ImportSource, TxType } from "../enums/index.js";
import { processPdfImport } from "../imports/service.js";
import { getGmailConnectUrl, runGmailBackfillForUser } from "../gmail/service.js";
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
  askTelegramContact,
  clearTelegramChat,
  downloadTelegramFile,
  editTelegramMessage,
  registerTelegramCommands,
  sendTelegramMessage,
  telegramProgressPublisher,
  type TelegramCallbackQuery,
  type TelegramChatClearer,
  type TelegramMessage,
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
import {
  contactIsOwn,
  generateTelegramCode,
  hashTelegramCode,
  maskPhone,
  normalizePhone,
  TELEGRAM_CODE_MAX_ATTEMPTS,
  TELEGRAM_CODE_RESEND_MS,
  TELEGRAM_CODE_TTL_MS,
  telegramCodeMatches,
} from "./phone.js";
import { followGmailSync, syncProgressText, type SyncRunSnapshot } from "./syncWatch.js";
import type { InlineKeyboard } from "./ui.js";
import type { TelegramPhoneChallenge, UserRow } from "../db/types.js";

const NOT_LINKED =
  "🔗 This chat isn't linked. Enter your Telegram number in Ledgerline Settings, then send /start and tap Share my number.";

const SHARE_NUMBER = [
  "📱 <b>Share the mobile number on this Telegram account.</b>",
  "",
  "Enter that same number in Ledgerline Settings first.",
  "Tap the button below — Telegram confirms it is yours, and I'll send a code in this chat.",
  "Enter the code in Settings. A typed number alone can't link an account.",
].join("\n");

const activeSyncs = new Set<string>();

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

export type TelegramVerifyState = {
  phone: string;
  codeSent: boolean;
  expiresAt: string | null;
  botUrl: string | null;
};

export type TelegramStatus = {
  configured: boolean;
  linked: boolean;
  botUsername: string | null;
  phone: string | null;
  verify: TelegramVerifyState | null;
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

function verifyState(user: UserRow): TelegramVerifyState | null {
  if (user.telegramChatId || !user.telegramPhonePending) return null;
  const expiresAt = user.telegramPhoneCodeExpires;
  const expired = expiresAt != null && new Date(expiresAt).getTime() <= Date.now();
  const codeSent = Boolean(user.telegramPhoneCodeHash && user.telegramPhoneChatId && !expired);
  return {
    phone: maskPhone(user.telegramPhonePending),
    codeSent,
    expiresAt: codeSent ? expiresAt : null,
    botUrl: buildTelegramDeepLink(config.telegram.botUsername, "verify"),
  };
}

function publicStatus(user: UserRow): TelegramStatus {
  const verify = verifyState(user);
  return {
    configured: config.telegram.enabled,
    linked: Boolean(user.telegramChatId),
    botUsername: config.telegram.botUsername || null,
    phone: user.phoneE164 ? maskPhone(user.phoneE164) : null,
    verify,
    ...(verify?.botUrl ? { deepLink: verify.botUrl, startCommand: "/start verify" } : {}),
  };
}

async function loadUser(userId: string): Promise<UserRow> {
  const store = await getStore();
  const user = await store.findUserById(userId);
  if (!user) throw AppError.notFound("User not found");
  return user;
}

export async function getTelegramStatus(userId: string): Promise<TelegramStatus> {
  return publicStatus(await loadUser(userId));
}

export async function createTelegramLink(userId: string): Promise<TelegramStatus> {
  if (!config.telegram.enabled) {
    throw AppError.serviceUnavailable("Telegram is not configured");
  }
  const store = await getStore();
  const user = await loadUser(userId);
  if (user.telegramChatId) return publicStatus(user);
  const token = generateTelegramLinkToken();
  const updated = await store.setTelegramLinkToken(userId, token);
  await store.audit(userId, "telegram.link_created", {});
  return {
    ...publicStatus(updated ?? user),
    deepLink: buildTelegramDeepLink(config.telegram.botUsername, token),
    startCommand: `/start ${token}`,
  };
}

export async function unlinkTelegramAccount(userId: string): Promise<TelegramStatus> {
  const store = await getStore();
  await store.unlinkTelegram(userId);
  await store.audit(userId, "telegram.unlinked", { source: "settings" });
  return publicStatus(await loadUser(userId));
}

function codeMessage(code: string): string {
  return [
    "🔐 <b>Ledgerline code</b>",
    "",
    `<code>${code}</code>`,
    "",
    "Enter this in Settings within 10 minutes.",
    "If you didn't ask to link this chat, ignore this message.",
  ].join("\n");
}

async function deliverCode(
  userId: string,
  phone: string,
  chatId: string,
  send: TelegramSender,
): Promise<UserRow | null> {
  const store = await getStore();
  const code = generateTelegramCode();
  const now = new Date().toISOString();
  const challenge: TelegramPhoneChallenge = {
    phone,
    codeHash: hashTelegramCode(userId, code),
    expiresAt: new Date(Date.now() + TELEGRAM_CODE_TTL_MS).toISOString(),
    chatId,
    attempts: 0,
    sentAt: now,
  };
  const updated = await store.setTelegramPhoneChallenge(userId, challenge);
  await send(chatId, codeMessage(code), { keyboard: homeKeyboard() });
  await store.audit(userId, "telegram.code_sent", { phone: maskPhone(phone) });
  return updated;
}

async function askShareNumber(chatId: string, send: TelegramSender): Promise<void> {
  if (send === sendTelegramMessage) {
    await askTelegramContact(chatId, SHARE_NUMBER);
    return;
  }
  await send(chatId, SHARE_NUMBER);
}

export async function requestTelegramPhone(
  userId: string,
  rawPhone: string,
  send: TelegramSender = sendTelegramMessage,
): Promise<TelegramStatus> {
  if (!config.telegram.enabled && send === sendTelegramMessage) {
    throw AppError.serviceUnavailable("Telegram is not configured");
  }
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    throw AppError.badRequest("Enter a mobile number. Indian numbers can be 10 digits.");
  }
  const store = await getStore();
  const user = await loadUser(userId);
  if (user.telegramChatId) return publicStatus(user);
  const owner = await store.findUserByPhone(phone);
  if (owner && owner.id !== userId) {
    throw AppError.conflict("That number is already linked to another Ledgerline account.");
  }
  const pendingOwner = await store.findUserByPendingPhone(phone);
  if (pendingOwner && pendingOwner.id !== userId) {
    throw AppError.conflict("That number is already waiting to be verified on another account.");
  }
  const sentAt = user.telegramPhoneSentAt ? new Date(user.telegramPhoneSentAt).getTime() : 0;
  const expires = user.telegramPhoneCodeExpires
    ? new Date(user.telegramPhoneCodeExpires).getTime()
    : 0;
  const codeStillFresh =
    user.telegramPhonePending === phone &&
    Boolean(user.telegramPhoneCodeHash) &&
    expires > Date.now() &&
    Date.now() - sentAt < TELEGRAM_CODE_RESEND_MS &&
    Boolean(user.telegramPhoneChatId);
  if (codeStillFresh) return publicStatus(user);

  const known = await store.findTelegramPhoneChat(phone);
  if (!known) {
    await store.setTelegramPhoneChallenge(userId, {
      phone,
      codeHash: null,
      expiresAt: null,
      chatId: null,
      attempts: 0,
      sentAt: null,
    });
    await store.audit(userId, "telegram.phone_requested", { phone: maskPhone(phone) });
    return publicStatus(await loadUser(userId));
  }
  const chatOwner = await store.findUserByTelegramChatId(known.chatId);
  if (chatOwner && chatOwner.id !== userId) {
    throw AppError.conflict("That Telegram account is already linked to another Ledgerline user.");
  }
  await deliverCode(userId, phone, known.chatId, send);
  return publicStatus(await loadUser(userId));
}

export async function confirmTelegramPhone(userId: string, rawCode: string): Promise<TelegramStatus> {
  const code = rawCode.replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) {
    throw AppError.badRequest("Enter the 6-digit code from Telegram.");
  }
  const store = await getStore();
  const user = await loadUser(userId);
  if (user.telegramChatId) return publicStatus(user);
  if (!user.telegramPhonePending) {
    throw AppError.badRequest("Enter your Telegram number first.");
  }
  if (!user.telegramPhoneChatId || !user.telegramPhoneCodeHash || !user.telegramPhoneCodeExpires) {
    throw AppError.badRequest("Share your number with the Telegram bot first. The code is sent in that chat.");
  }
  if (new Date(user.telegramPhoneCodeExpires).getTime() <= Date.now()) {
    throw AppError.badRequest("That code expired. Request a new one.");
  }
  if (user.telegramPhoneAttempts >= TELEGRAM_CODE_MAX_ATTEMPTS) {
    throw AppError.badRequest("Too many tries. Request a new code.");
  }
  if (!telegramCodeMatches(userId, code, user.telegramPhoneCodeHash)) {
    await store.recordTelegramPhoneAttempt(userId);
    throw AppError.badRequest("That code doesn't match.");
  }
  const phone = user.telegramPhonePending;
  const chatId = user.telegramPhoneChatId;
  const taken = await store.findUserByTelegramChatId(chatId);
  if (taken && taken.id !== userId) {
    throw AppError.conflict("This Telegram is already linked to another Ledgerline account.");
  }
  const phoneOwner = await store.findUserByPhone(phone);
  if (phoneOwner && phoneOwner.id !== userId) {
    throw AppError.conflict("That number is already linked to another Ledgerline account.");
  }
  await store.setUserPhone(userId, phone);
  await store.linkTelegramChat(userId, chatId);
  const done = await store.setTelegramPhoneChallenge(userId, null);
  await store.audit(userId, "telegram.linked", { phone: maskPhone(phone) });
  return publicStatus(done ?? (await loadUser(userId)));
}

async function handleSharedContact(
  chatId: string,
  message: TelegramMessage,
  send: TelegramSender,
): Promise<void> {
  const contact = message.contact;
  if (!contact) return;
  if (!contactIsOwn(message.from?.id, contact.user_id)) {
    await send(
      chatId,
      "That contact isn't this account's own number. Tap Share my number so Telegram confirms it.",
    );
    await askShareNumber(chatId, send);
    return;
  }
  const phone = normalizePhone(contact.phone_number);
  if (!phone || message.from?.id == null) {
    await send(chatId, "Couldn't read that number. Tap Share my number again.");
    return;
  }
  const store = await getStore();
  await store.upsertTelegramPhoneChat({
    phoneE164: phone,
    chatId,
    telegramUserId: String(message.from.id),
  });
  const already = await store.findUserByTelegramChatId(chatId);
  if (already) {
    await send(chatId, "🎉 This chat is already linked to your Ledgerline account.", {
      keyboard: homeKeyboard(),
    });
    return;
  }
  const waiting = await store.findUserByPendingPhone(phone);
  if (!waiting) {
    await send(
      chatId,
      "No Ledgerline account is waiting for this number. Enter it in Settings, then share it here again.",
    );
    return;
  }
  await deliverCode(waiting.id, phone, chatId, send);
}

async function catalogFor(userId: string): Promise<CatalogCategory[]> {
  const store = await getStore();
  return toCatalog(await store.listCategories(userId));
}

async function currentAsk(userId: string, chatId: string, now = new Date()) {
  const store = await getStore();
  const catalog = await catalogFor(userId);
  const today = istClock(now).date;
  const open = (await store.listTransactions(userId, { from: today, to: today })).filter((row) =>
    categoryGap(row.categorySlug, catalog),
  )
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
  now = new Date(),
): Promise<boolean> {
  const ask = await currentAsk(userId, chatId, now);
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
  const store = await getStore();
  if (!token || token === "verify") {
    const linked = await store.findUserByTelegramChatId(chatId);
    if (linked) {
      await send(chatId, "🎉 This chat is already linked to your Ledgerline account.", {
        keyboard: homeKeyboard(),
      });
      return;
    }
    await askShareNumber(chatId, send);
    return;
  }
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

async function pendingAsk(userId: string, chatId: string, now = new Date()) {
  const store = await getStore();
  const pending = await store.getOldestPendingTelegramPrompt(chatId);
  if (pending && pending.userId === userId) {
    const tx = await store.getTransaction(userId, pending.transactionId);
    const catalog = await catalogFor(userId);
    const gap = tx ? categoryGap(tx.categorySlug, catalog) : null;
    if (tx && gap) return { catalog, tx, gap, prompt: pending, remaining: 1 };
  }
  return currentAsk(userId, chatId, now);
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
  const ask = await pendingAsk(user.id, chatId);
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
  const ask = await pendingAsk(user.id, chatId);
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

/**
 * Button taps rewrite the message that was tapped. A new bubble would paste the
 * whole menu underneath every reply.
 */
async function present(
  chatId: string,
  text: string,
  send: TelegramSender,
  keyboard: InlineKeyboard | undefined,
  messageId?: number,
): Promise<void> {
  if (messageId != null && send === sendTelegramMessage) {
    const edited = await editTelegramMessage(chatId, messageId, text, keyboard);
    if (edited) return;
  }
  await send(chatId, text, keyboard ? { keyboard } : undefined);
}

async function formatProfile(userId: string): Promise<string> {
  const store = await getStore();
  const user = await store.findUserById(userId);
  const gmail = await store.getGmailConnection(userId);
  const sameInbox =
    gmail != null &&
    !gmail.disconnectedAt &&
    gmail.googleEmail.toLowerCase() === (user?.email ?? "").toLowerCase();
  const gmailLine =
    !gmail || gmail.disconnectedAt ? "Not connected" : sameInbox ? "Connected" : esc(gmail.googleEmail);
  const limit =
    user?.dailySpendLimit != null
      ? `₹${user.dailySpendLimit.toLocaleString("en-IN")}`
      : "None";
  const phone = user?.phoneE164 ? maskPhone(user.phoneE164) : "Not linked";
  const reminder =
    user?.telegramRemindMinute != null
      ? `${formatReminderClock(user.telegramRemindMinute)} IST`
      : "Off";
  return [
    "👤 <b>Profile</b>",
    "",
    `Name  ${esc(user?.displayName?.trim() || "—")}`,
    `Email  ${esc(user?.email || "—")}`,
    `Phone  ${phone}`,
    `Gmail  ${gmailLine}`,
    `Daily limit  ${limit}`,
    `Reminder  ${reminder}`,
  ].join("\n");
}

async function handleCallback(
  query: TelegramCallbackQuery,
  send: TelegramSender,
  clearChat: TelegramChatClearer,
): Promise<void> {
  if (send === sendTelegramMessage) void answerTelegramCallback(query.id);
  const chatId = String(query.message?.chat.id ?? query.from.id);
  if (query.message && query.message.chat.type !== "private") return;
  const action = parseTelegramAction(query.data ?? "");
  const messageId = query.message?.message_id;
  if (!action) {
    await present(chatId, "⌛ That button expired.", send, homeKeyboard(), messageId);
    return;
  }
  if (action.kind === "clear") {
    await handleClear(chatId, query.message?.message_id, send, clearChat);
    return;
  }
  await handleAction(chatId, action, send, messageId);
}

const STATEMENT_HINT =
  "📄 <b>Send a statement</b>\nAttach the PDF here. Put the password in the caption, or reply with it next.\nThe password opens that file and is not saved. /cancel drops it.";

async function handleAction(
  chatId: string,
  action: Exclude<NonNullable<ReturnType<typeof parseTelegramAction>>, { kind: "clear" }>,
  send: TelegramSender,
  messageId?: number,
): Promise<void> {
  const show = (text: string, keyboard?: InlineKeyboard) =>
    present(chatId, text, send, keyboard, messageId);
  if (action.kind === "home") {
    await show("🏠 <b>Ledgerline</b>\nWhat would you like to see?", homeKeyboard());
    return;
  }
  if (action.kind === "spent-menu") {
    await show("🏷 <b>Which category?</b>\nI'll show what you spent on it this month.", categoryKeyboard());
    return;
  }
  if (action.kind === "limit-menu") {
    await show("🎯 <b>Daily limit</b>\nI'll warn you when a day goes over it.", limitKeyboard());
    return;
  }
  if (action.kind === "remind-menu") {
    await show("⏰ <b>Daily status</b>\nPick a time, India time.", remindKeyboard());
    return;
  }
  if (action.kind === "statement") {
    await show(STATEMENT_HINT, homeKeyboard());
    return;
  }
  if (action.kind === "clear-menu") {
    await show(CLEAR_PROMPT, clearConfirmKeyboard());
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
  if (action.kind === "profile") {
    await show(await formatProfile(user.id), homeKeyboard());
    return;
  }
  if (action.kind === "set-limit") {
    await store.updateUserPreferences(user.id, { dailySpendLimit: action.amount });
    await show(limitSetText(action.amount), homeKeyboard());
    return;
  }
  if (action.kind === "set-remind") {
    await store.setTelegramReminder(user.id, action.minute);
    await show(remindSetText(action.minute), homeKeyboard());
    return;
  }
  if (action.kind === "scan" || action.kind === "sync") {
    await runGmailSync(chatId, user.id, "", send, messageId);
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
  await show(text, homeKeyboard());
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

const TECHNICAL_ERROR =
  /failed query:|params:|select "|insert "|update "|prepared statement|ECONN|ENOTFOUND|timeout|Connection|terminated|pool after/i;

function errorDetail(error: unknown): string {
  if (!(error instanceof Error)) return "";
  const cause = error.cause instanceof Error ? error.cause.message : "";
  return cause || error.message;
}

/** Database failures include the SQL. The chat should only see a short line. */
export function formatTelegramError(error: unknown, fallback: string): string {
  const detail = errorDetail(error).split("\n")[0]?.trim() ?? "";
  if (!detail || TECHNICAL_ERROR.test(detail) || detail.length > 180) {
    logger.warn({ err: error }, "telegram action failed");
    return `⚠️ ${fallback}`;
  }
  return `⚠️ ${esc(detail)}`;
}

function errorText(error: unknown, fallback: string): string {
  return formatTelegramError(error, fallback);
}

async function withDbRetry<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (!TECHNICAL_ERROR.test(errorDetail(error))) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return work();
  }
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
  if (message.contact) {
    await handleSharedContact(chatId, message, send);
    return;
  }
  if (message.document) {
    await handleStatementDocument(chatId, message.document, message.caption ?? "", send, fetchFile);
    return;
  }
  if (!message.text) return;
  const text = message.text.trim();
  const button = text.toLowerCase();
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
    await send(chatId, "📥 <b>Got the PDF.</b>\n🔑 Reply with the statement password. It is not saved. /cancel drops this file.", {
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
    const clock = istClock(new Date());
    if (!isQuietHours(clock.minutes)) {
      const asked = await sendNextPrompt(chatId, userId, send);
      if (asked) await store.markTelegramCategoryPinged(userId, new Date().toISOString());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/password/i.test(message)) {
      await store.setTelegramPendingFile(userId, { fileId, fileName });
      await send(
        chatId,
        "🔑 That password didn't open the PDF. Reply with it again. Nothing was saved.",
        { keyboard: homeKeyboard() },
      );
      return;
    }
    await store.setTelegramPendingFile(userId, null);
    await send(chatId, errorText(error, "Could not import that statement."), { keyboard: homeKeyboard() });
  }
}

function runIsFresh(run: { status: string; startedAt: string; meta?: Record<string, unknown> }): boolean {
  if (run.status !== "running") return false;
  const stamp = typeof run.meta?.progressAt === "string" ? run.meta.progressAt : run.startedAt;
  const at = new Date(stamp).getTime();
  return Number.isFinite(at) && Date.now() - at < 3 * 60 * 1000;
}

async function startMonthScan(userId: string, password: string): Promise<{ runId: string }> {
  const store = await getStore();
  if ((await store.listAccounts(userId)).length === 0) {
    await store.getOrCreateAccount(userId, "hdfc");
  }
  const accounts = await store.listAccounts(userId);
  const account = accounts.find((row) => row.poolingEnabled) ?? accounts[0];
  if (!account || account.statementSenderEmails.length === 0) {
    throw AppError.badRequest("Add a bank and its statement sender on Import, then sync again.");
  }
  if (!account.poolingEnabled) {
    await store.setPoolingEnabled(userId, account.id, true);
  }
  const recent = await withDbRetry(() => store.listPoolingRuns(userId, 5));
  const running = recent.find((run) => run.status === "running" && runIsFresh(run));
  if (running) return { runId: running.id };
  const month = istClock(new Date()).date.slice(0, 7);
  const started = await runGmailBackfillForUser(userId, {
    month,
    password,
    maxMessages: BACKFILL_DEFAULT_MAX_MESSAGES,
  });
  return { runId: started.runId };
}

function toSnapshot(run: {
  id: string;
  status: string;
  scanned: number;
  imported: number;
  skipped: number;
  errorMessage: string | null;
  meta?: Record<string, unknown>;
}): SyncRunSnapshot {
  const estimate = run.meta?.estimate;
  return {
    id: run.id,
    status: run.status,
    scanned: run.scanned,
    imported: run.imported,
    skipped: run.skipped,
    errorMessage: run.errorMessage,
    estimate: typeof estimate === "number" && estimate > 0 ? estimate : null,
  };
}

async function finishGmailSync(
  chatId: string,
  userId: string,
  password: string,
  send: TelegramSender,
  messageId?: number,
): Promise<void> {
  const publish = telegramProgressPublisher(chatId, send);
  const say = async (text: string) => {
    if (messageId != null) {
      await present(chatId, text, send, homeKeyboard(), messageId);
      return;
    }
    await publish(text);
  };
  try {
    await say(syncProgressText({ status: "running", scanned: 0, imported: 0, skipped: 0, errorMessage: null }));
    const started = await startMonthScan(userId, password);
    const run = await followGmailSync({
      publish: say,
      announce: false,
      read: async () => {
        const store = await getStore();
        const rows = await withDbRetry(() => store.listPoolingRuns(userId, 5));
        const current = rows.find((row) => row.id === started.runId);
        return current ? toSnapshot(current) : null;
      },
    });
    if (!run) return;
    const snapshot = await loadSpendSnapshot(userId);
    const clock = istClock(new Date());
    const quiet = isQuietHours(clock.minutes)
      ? "\n\n🌙 I'll ask about unlabeled payments after 10:00."
      : "";
    await say(`${syncProgressText(run)}\n\n${formatToday(snapshot)}${quiet}`);
    if (run.status === "failed" || quiet) return;
    const store = await getStore();
    const asked = await sendNextPrompt(chatId, userId, send);
    if (asked) await store.markTelegramCategoryPinged(userId, new Date().toISOString());
  } catch (error) {
    await say(errorText(error, "Could not sync Gmail."));
  }
}

async function runGmailSync(
  chatId: string,
  userId: string,
  password: string,
  send: TelegramSender,
  messageId?: number,
): Promise<void> {
  const store = await getStore();
  const connection = await store.getGmailConnection(userId);
  if (!connection || connection.disconnectedAt) {
    await present(
      chatId,
      "📧 Connect email first. Tap 📧 Connect email below.",
      send,
      homeKeyboard(),
      messageId,
    );
    return;
  }
  if (activeSyncs.has(userId)) return;
  activeSyncs.add(userId);
  void finishGmailSync(chatId, userId, password, send, messageId)
    .catch((error: unknown) => {
      logger.warn({ err: error, userId }, "telegram gmail sync failed");
    })
    .finally(() => {
      activeSyncs.delete(userId);
    });
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
    await send(chatId, "🏠 <b>Ledgerline</b>\nTap a button. This chat only sees your account.", {
      keyboard: homeKeyboard(),
    });
    return;
  }
  if (command.kind === "unlink") {
    await handleUnlinkCommand(chatId, send);
    return;
  }
  if (command.kind === "statement") {
    await send(chatId, STATEMENT_HINT, { keyboard: homeKeyboard() });
    return;
  }
  if (command.kind === "cancel") {
    const user = await requireLinked(chatId, send);
    if (!user) return;
    const store = await getStore();
    await store.setTelegramPendingFile(user.id, null);
    await send(chatId, "📄 Statement upload cancelled. Your expenses are unchanged.", {
      keyboard: homeKeyboard(),
    });
    return;
  }
  if (command.kind === "clear") {
    await send(chatId, CLEAR_PROMPT, { keyboard: clearConfirmKeyboard() });
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
    await sendGmailLink(chatId, user.id, send);
    return;
  }
  if (command.kind === "unknown") {
    await send(chatId, "🤷 I don't know that command. Tap a button.", { keyboard: homeKeyboard() });
    return;
  }
  const user = await requireLinked(chatId, send);
  if (!user) return;
  const store = await getStore();
  if (command.kind === "limit") {
    if (!command.valid) {
      await send(chatId, "🎯 <b>Pick a limit.</b>", { keyboard: limitKeyboard() });
      return;
    }
    await store.updateUserPreferences(user.id, { dailySpendLimit: command.amount });
    await send(chatId, limitSetText(command.amount), { keyboard: homeKeyboard() });
    return;
  }
  if (command.kind === "remind") {
    if (!command.valid) {
      await send(chatId, "⏰ <b>Pick a time.</b>", { keyboard: remindKeyboard() });
      return;
    }
    await store.setTelegramReminder(user.id, command.minute);
    await send(chatId, remindSetText(command.minute), { keyboard: homeKeyboard() });
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
    if (tx.date !== istClock(new Date()).date) continue;
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

/** Ask each linked chat about today's unlabeled payments, at most once every six hours, never 02:00–10:00 IST. */
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
    const asked = await sendNextPrompt(user.telegramChatId, user.id, send, now);
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
      const reason =
        error && typeof error === "object" && "cause" in error && error.cause instanceof Error
          ? error.cause.message
          : error instanceof Error
            ? (error.message.split("\n")[0]?.slice(0, 180) ?? error.message)
            : String(error);
      logger.warn({ reason }, "telegram category ask failed");
    });
  };
  setTimeout(tick, 20_000).unref?.();
  setInterval(tick, 15 * 60 * 1000).unref?.();
}
