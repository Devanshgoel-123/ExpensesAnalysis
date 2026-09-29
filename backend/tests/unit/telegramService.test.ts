import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetStoreForTests } from "../../src/db/index.js";
import { MemoryStore } from "../../src/db/memory.js";
import { parseTelegramCommand } from "../../src/telegram/commands.js";
import { istClock } from "../../src/telegram/briefing.js";
import {
  buildTelegramDeepLink,
  handleTelegramUpdate,
  notifyMailDebits,
  parseStartCommand,
  sendDueTelegramReminders,
} from "../../src/telegram/service.js";

async function setupUser() {
  const store = new MemoryStore();
  await store.migrate();
  const user = await store.createUser({
    email: "tg@example.com",
    passwordHash: "hash",
    displayName: "Tg",
  });
  resetStoreForTests(store);
  return { store, user };
}

describe("parseStartCommand", () => {
  it("reads a link token from /start", () => {
    assert.deepEqual(parseStartCommand("/start ll_abc"), {
      matched: true,
      token: "ll_abc",
    });
    assert.deepEqual(parseStartCommand("/start@ledgerline_bot ll_abc"), {
      matched: true,
      token: "ll_abc",
    });
    assert.deepEqual(parseStartCommand("/start"), {
      matched: true,
      token: null,
    });
    assert.equal(parseStartCommand("food").matched, false);
  });
});

describe("buildTelegramDeepLink", () => {
  it("builds a t.me start URL when a username exists", () => {
    assert.equal(
      buildTelegramDeepLink("ledgerline_bot", "ll_abc"),
      "https://t.me/ledgerline_bot?start=ll_abc",
    );
    assert.equal(buildTelegramDeepLink("", "ll_abc"), null);
  });
});

describe("telegram category flow", () => {
  it("links a chat from /start and applies a category reply", async () => {
    const { store, user } = await setupUser();
    await store.setTelegramLinkToken(user.id, "ll_testtoken");
    const sent: string[] = [];
    const send = async (_chatId: string, text: string) => {
      sent.push(text);
    };

    await handleTelegramUpdate(
      {
        update_id: 1,
        message: {
          message_id: 1,
          chat: { id: 4242, type: "private" },
          text: "/start ll_testtoken",
        },
      },
      send,
    );

    const linked = await store.findUserById(user.id);
    assert.equal(linked?.telegramChatId, "4242");
    assert.equal(linked?.telegramLinkToken, null);
    assert.match(sent.at(-1) ?? "", /Connected/);

    const account = await store.getOrCreateAccount(user.id, "hdfc");
    const inserted = await store.insertTransactions(user.id, [
      {
        importId: null,
        accountId: account.id,
        date: "2026-09-26",
        time: null,
        description: "UPI coffee",
        amount: 184,
        type: "debit",
        upiId: null,
        merchant: null,
        payee: null,
        providerId: null,
        categorySlug: null,
        classificationSource: "email_alert",
        fingerprint: "fp-tg-184",
        mailMessageId: null,
        origin: "mail" as const,
        verifiedAt: null,
      },
    ]);
    assert.equal(inserted.ids.length, 1);

    await notifyMailDebits(user.id, inserted.ids, send);
    assert.match(sent.at(-1) ?? "", /₹184/);

    await handleTelegramUpdate(
      {
        update_id: 2,
        message: {
          message_id: 2,
          chat: { id: 4242, type: "private" },
          text: "lunch",
        },
      },
      send,
    );

    const tx = await store.getTransaction(user.id, inserted.ids[0]!);
    assert.equal(tx?.categorySlug, "food");
    assert.equal(tx?.classificationSource, "telegram");
    assert.match(sent.at(-1) ?? "", /Saved as food/);
  });

  it("rejects an expired start token", async () => {
    const { store } = await setupUser();
    const sent: string[] = [];
    await handleTelegramUpdate(
      {
        update_id: 3,
        message: {
          message_id: 3,
          chat: { id: 99, type: "private" },
          text: "/start ll_missing",
        },
      },
      async (_chatId, text) => {
        sent.push(text);
      },
    );
    assert.match(sent[0] ?? "", /expired/);
    assert.equal(await store.findUserByTelegramChatId("99"), null);
  });

  it("answers /status and sets a limit and a reminder", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "7");
    const today = istClock(new Date()).date;
    const account = await store.getOrCreateAccount(user.id, "hdfc");
    await store.insertTransactions(user.id, [
      {
        importId: null,
        accountId: account.id,
        date: today,
        time: null,
        description: "UPI lunch",
        amount: 250,
        type: "debit",
        upiId: null,
        merchant: "Lunch",
        payee: null,
        providerId: null,
        categorySlug: "food",
        classificationSource: "parser",
        fingerprint: "fp-status",
        mailMessageId: null,
        origin: "mail",
        verifiedAt: null,
      },
    ]);
    const sent: string[] = [];
    const send = async (_chatId: string, text: string) => {
      sent.push(text);
    };
    const message = (text: string) =>
      handleTelegramUpdate(
        { update_id: 1, message: { message_id: 1, chat: { id: 7, type: "private" }, text } },
        send,
      );
    await message("/status");
    assert.match(sent.at(-1) ?? "", /250/);
    await message("/spent food");
    assert.match(sent.at(-1) ?? "", /Food/);
    await message("/limit 800");
    assert.equal((await store.findUserById(user.id))?.dailySpendLimit, 800);
    await message("/remind 21:30");
    assert.equal((await store.findUserById(user.id))?.telegramRemindMinute, 21 * 60 + 30);
    await store.setTelegramReminder(user.id, 0);
    const before = sent.length;
    await sendDueTelegramReminders(new Date(), send);
    assert.equal(sent.length, before + 1);
    await sendDueTelegramReminders(new Date(), send);
    assert.equal(sent.length, before + 1);
  });
});

describe("telegram statement upload", () => {
  it("asks an unlinked chat to connect before accepting a PDF", async () => {
    await setupUser();
    const sent: string[] = [];
    await handleTelegramUpdate(
      {
        update_id: 8,
        message: {
          message_id: 8,
          chat: { id: 55, type: "private" },
          document: { file_id: "file-1", file_name: "stmt.pdf", mime_type: "application/pdf" },
        },
      },
      async (_chatId, text) => {
        sent.push(text);
      },
    );
    assert.match(sent[0] ?? "", /not linked/);
  });

  it("waits for a password, then reads the file for that user", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "55");
    const sent: string[] = [];
    const send = async (_chatId: string, text: string) => {
      sent.push(text);
    };
    await handleTelegramUpdate(
      {
        update_id: 9,
        message: {
          message_id: 9,
          chat: { id: 55, type: "private" },
          document: { file_id: "file-9", file_name: "stmt.pdf", mime_type: "application/pdf" },
        },
      },
      send,
    );
    assert.match(sent.at(-1) ?? "", /password/);
    assert.equal((await store.findUserById(user.id))?.telegramPendingFileId, "file-9");
    let fetched = "";
    await handleTelegramUpdate(
      {
        update_id: 10,
        message: { message_id: 10, chat: { id: 55, type: "private" }, text: "not-the-password" },
      },
      send,
      async (fileId) => {
        fetched = fileId;
        return Buffer.from("not a pdf");
      },
    );
    assert.equal(fetched, "file-9");
    assert.match(sent.at(-1) ?? "", /./);
  });
});

describe("telegram mail scan", () => {
  it("asks for email before scanning", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "77");
    const sent: string[] = [];
    await handleTelegramUpdate(
      {
        update_id: 11,
        message: { message_id: 11, chat: { id: 77, type: "private" }, text: "Scan mail" },
      },
      async (_chatId, text) => {
        sent.push(text);
      },
    );
    assert.match(sent.at(-1) ?? "", /Connect email/);
  });
});

describe("telegram buttons", () => {
  it("runs status from an inline button for the linked chat only", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "77");
    const sent: string[] = [];
    await handleTelegramUpdate(
      {
        update_id: 12,
        callback_query: {
          id: "cb-1",
          data: "m:month",
          from: { id: 77 },
          message: { message_id: 1, chat: { id: 77, type: "private" } },
        },
      },
      async (_chatId, text) => {
        sent.push(text);
      },
    );
    assert.match(sent.at(-1) ?? "", /This month/);
    assert.equal(user.id, (await store.findUserByTelegramChatId("77"))?.id);
  });
});

describe("parseTelegramCommand", () => {
  it("reads reminder and limit commands", () => {
    assert.deepEqual(parseTelegramCommand("/remind 21:30"), {
      kind: "remind",
      minute: 21 * 60 + 30,
      valid: true,
    });
    assert.deepEqual(parseTelegramCommand("/limit off"), {
      kind: "limit",
      amount: null,
      valid: true,
    });
    assert.equal(parseTelegramCommand("food"), null);
  });
});
