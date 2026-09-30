import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetStoreForTests } from "../../src/db/index.js";
import { MemoryStore } from "../../src/db/memory.js";
import { parseTelegramCommand } from "../../src/telegram/commands.js";
import { istClock } from "../../src/telegram/briefing.js";
import { normalizePhone } from "../../src/telegram/phone.js";
import { followGmailSync, syncProgressText } from "../../src/telegram/syncWatch.js";
import {
  buildTelegramDeepLink,
  confirmTelegramPhone,
  formatTelegramError,
  handleTelegramUpdate,
  notifyMailDebits,
  parseStartCommand,
  requestTelegramPhone,
  sendDueCategoryPrompts,
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
        date: "2026-09-30",
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
    await sendDueCategoryPrompts(new Date("2026-09-30T11:00:00+05:30"), send);
    assert.match(sent.at(-1) ?? "", /₹184/);
    assert.match(sent.at(-1) ?? "", /No category yet/);

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
    assert.match(sent.at(-1) ?? "", /Saved as Food/);
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
    const noon = new Date("2026-09-30T12:00:00+05:30");
    await sendDueTelegramReminders(noon, send);
    assert.equal(sent.length, before + 1);
    await sendDueTelegramReminders(noon, send);
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
    assert.match(sent[0] ?? "", /isn't linked/);
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
    assert.equal((await store.findUserById(user.id))?.telegramPendingFileId, null);
  });

  it("keeps the PDF when the password is wrong and does not save the password", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "56");
    const send = async () => undefined;
    await handleTelegramUpdate(
      {
        update_id: 13,
        message: {
          message_id: 13,
          chat: { id: 56, type: "private" },
          document: { file_id: "file-13", file_name: "stmt.pdf", mime_type: "application/pdf" },
          caption: "wrong-pass",
        },
      },
      send,
      async () => {
        throw new Error("Incorrect PDF password");
      },
    );
    const waiting = await store.findUserById(user.id);
    assert.equal(waiting?.telegramPendingFileId, "file-13");
    assert.equal(JSON.stringify(waiting).includes("wrong-pass"), false);
    await handleTelegramUpdate(
      {
        update_id: 14,
        message: { message_id: 14, chat: { id: 56, type: "private" }, text: "/cancel" },
      },
      send,
    );
    assert.equal((await store.findUserById(user.id))?.telegramPendingFileId, null);
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

describe("telegram category asks", () => {
  it("stays quiet from 2:00 to 10:00 IST and then asks", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "88");
    const account = await store.getOrCreateAccount(user.id, "hdfc");
    await store.insertTransactions(user.id, [
      {
        importId: null,
        accountId: account.id,
        date: "2026-09-30",
        time: null,
        description: "UPI coffee",
        amount: 90,
        type: "debit",
        upiId: null,
        merchant: "Cafe",
        payee: null,
        providerId: null,
        categorySlug: null,
        classificationSource: "email_alert",
        fingerprint: "fp-quiet",
        mailMessageId: null,
        origin: "mail",
        verifiedAt: null,
      },
    ]);
    const sent: string[] = [];
    const send = async (_chatId: string, text: string) => {
      sent.push(text);
    };
    await sendDueCategoryPrompts(new Date("2026-09-30T03:30:00+05:30"), send);
    assert.equal(sent.length, 0);
    await sendDueCategoryPrompts(new Date("2026-09-30T10:00:00+05:30"), send);
    assert.match(sent.at(-1) ?? "", /Cafe/);
    assert.match(sent.at(-1) ?? "", /No category yet/);
  });

  it("asks again only after six hours", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "89");
    const account = await store.getOrCreateAccount(user.id, "hdfc");
    await store.insertTransactions(user.id, [
      {
        importId: null,
        accountId: account.id,
        date: "2026-09-30",
        time: null,
        description: "UPI",
        amount: 40,
        type: "debit",
        upiId: null,
        merchant: "Stall",
        payee: null,
        providerId: null,
        categorySlug: null,
        classificationSource: "email_alert",
        fingerprint: "fp-six",
        mailMessageId: null,
        origin: "mail",
        verifiedAt: null,
      },
    ]);
    const sent: string[] = [];
    const send = async (_chatId: string, text: string) => {
      sent.push(text);
    };
    await sendDueCategoryPrompts(new Date("2026-09-30T11:00:00+05:30"), send);
    assert.equal(sent.length, 1);
    await sendDueCategoryPrompts(new Date("2026-09-30T12:00:00+05:30"), send);
    assert.equal(sent.length, 1);
    await sendDueCategoryPrompts(new Date("2026-09-30T17:00:00+05:30"), send);
    assert.equal(sent.length, 2);
  });

  it("asks for a type when only the parent category is set", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "90");
    const account = await store.getOrCreateAccount(user.id, "hdfc");
    const inserted = await store.insertTransactions(user.id, [
      {
        importId: null,
        accountId: account.id,
        date: "2026-09-30",
        time: null,
        description: "UPI",
        amount: 640,
        type: "debit",
        upiId: null,
        merchant: "Uber",
        payee: null,
        providerId: null,
        categorySlug: "travel",
        classificationSource: "parser",
        fingerprint: "fp-uber",
        mailMessageId: null,
        origin: "mail",
        verifiedAt: null,
      },
    ]);
    const sent: string[] = [];
    const send = async (_chatId: string, text: string) => {
      sent.push(text);
    };
    await sendDueCategoryPrompts(new Date("2026-09-30T11:00:00+05:30"), send);
    assert.match(sent.at(-1) ?? "", /Uber/);
    assert.match(sent.at(-1) ?? "", /This is Travel/);
    await handleTelegramUpdate(
      {
        update_id: 30,
        callback_query: {
          id: "cb-rides",
          data: "c:rides",
          from: { id: 90 },
          message: { message_id: 4, chat: { id: 90, type: "private" } },
        },
      },
      send,
    );
    assert.equal((await store.getTransaction(user.id, inserted.ids[0]!))?.categorySlug, "rides");
    assert.match(sent.at(-1) ?? "", /Saved as Rides/);
  });

  it("sync asks to connect email when Gmail is missing", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "91");
    const sent: string[] = [];
    await handleTelegramUpdate(
      {
        update_id: 31,
        message: { message_id: 5, chat: { id: 91, type: "private" }, text: "/sync" },
      },
      async (_chatId, text) => {
        sent.push(text);
      },
    );
    assert.match(sent.at(-1) ?? "", /Connect email/);
  });
});

describe("telegram clear chat", () => {
  it("asks first, then deletes messages from the confirm back and keeps every expense", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "92");
    const account = await store.getOrCreateAccount(user.id, "hdfc");
    await store.insertTransactions(user.id, [
      {
        importId: null,
        accountId: account.id,
        date: "2026-09-23",
        time: null,
        description: "UPI",
        amount: 120,
        type: "debit",
        upiId: null,
        merchant: "Chai",
        payee: null,
        providerId: null,
        categorySlug: "food",
        classificationSource: "telegram",
        fingerprint: "fp-clear",
        mailMessageId: null,
        origin: "mail",
        verifiedAt: null,
      },
    ]);
    const sent: string[] = [];
    const send = async (_chatId: string, text: string) => {
      sent.push(text);
    };
    const cleared: Array<[string, number]> = [];
    const clearChat = async (chatId: string, newestId: number) => {
      cleared.push([chatId, newestId]);
    };

    await handleTelegramUpdate(
      { update_id: 40, message: { message_id: 50, chat: { id: 92, type: "private" }, text: "/clear" } },
      send,
      undefined,
      clearChat,
    );
    assert.match(sent.at(-1) ?? "", /Clear this chat\?/);
    assert.match(sent.at(-1) ?? "", /expenses, labels and settings stay saved/);
    assert.equal(cleared.length, 0);

    await handleTelegramUpdate(
      {
        update_id: 41,
        callback_query: {
          id: "cb-clear",
          data: "x:clear",
          from: { id: 92 },
          message: { message_id: 51, chat: { id: 92, type: "private" } },
        },
      },
      send,
      undefined,
      clearChat,
    );
    assert.deepEqual(cleared, [["92", 51]]);
    assert.match(sent.at(-1) ?? "", /Chat cleared/);
    const rows = await store.listTransactions(user.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.categorySlug, "food");
  });

  it("escapes bank text in HTML messages", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "93");
    const account = await store.getOrCreateAccount(user.id, "hdfc");
    await store.insertTransactions(user.id, [
      {
        importId: null,
        accountId: account.id,
        date: "2026-09-30",
        time: null,
        description: "UPI",
        amount: 75,
        type: "debit",
        upiId: null,
        merchant: "A&B <Foods>",
        payee: null,
        providerId: null,
        categorySlug: null,
        classificationSource: "email_alert",
        fingerprint: "fp-esc",
        mailMessageId: null,
        origin: "mail",
        verifiedAt: null,
      },
    ]);
    const sent: string[] = [];
    await sendDueCategoryPrompts(new Date("2026-09-30T11:00:00+05:30"), async (_chatId, text) => {
      sent.push(text);
    });
    assert.match(sent.at(-1) ?? "", /A&amp;B &lt;Foods&gt;/);
  });
});

describe("telegram phone link", () => {
  const sendOf = (sent: string[]) => async (_chatId: string, text: string) => {
    sent.push(text);
  };

  it("normalizes an Indian mobile to digits with country code", () => {
    assert.equal(normalizePhone("98765 43210"), "919876543210");
    assert.equal(normalizePhone("+91 98765 43210"), "919876543210");
    assert.equal(normalizePhone("123"), null);
  });

  it("sends a code only after Telegram confirms the number, then links that chat", async () => {
    const { store, user } = await setupUser();
    const sent: string[] = [];
    const waiting = await requestTelegramPhone(user.id, "9876543210", sendOf(sent));
    assert.equal(waiting.verify?.codeSent, false);
    assert.equal(sent.length, 0);

    await handleTelegramUpdate(
      {
        update_id: 40,
        message: {
          message_id: 40,
          chat: { id: 555, type: "private" },
          from: { id: 555 },
          contact: { phone_number: "919876543210", user_id: 4242 },
        },
      },
      sendOf(sent),
    );
    assert.equal(sent.join("\n").match(/\b(\d{6})\b/), null);
    assert.equal((await store.findUserById(user.id))?.telegramChatId, null);

    await handleTelegramUpdate(
      {
        update_id: 41,
        message: {
          message_id: 41,
          chat: { id: 555, type: "private" },
          from: { id: 555 },
          contact: { phone_number: "+91 98765 43210", user_id: 555 },
        },
      },
      sendOf(sent),
    );
    const code = sent.join("\n").match(/\b(\d{6})\b/)?.[1];
    assert.ok(code);
    const wrong = code === "000000" ? "111111" : "000000";
    await assert.rejects(() => confirmTelegramPhone(user.id, wrong), /doesn't match/);
    const linked = await confirmTelegramPhone(user.id, code!);
    assert.equal(linked.linked, true);
    assert.match(linked.phone ?? "", /3210/);
    assert.equal((await store.findUserById(user.id))?.telegramChatId, "555");
    assert.equal((await store.findUserById(user.id))?.phoneE164, "919876543210");
  });

  it("refuses a number another account is already verifying", async () => {
    const { store, user } = await setupUser();
    const other = await store.createUser({
      email: "other@example.com",
      passwordHash: "hash",
    });
    await requestTelegramPhone(user.id, "9876543210", async () => undefined);
    await assert.rejects(
      () => requestTelegramPhone(other.id, "9876543210", async () => undefined),
      /another account/,
    );
  });
});

describe("telegram profile", () => {
  it("shows the linked account from the profile button", async () => {
    const { store, user } = await setupUser();
    await store.linkTelegramChat(user.id, "77");
    const sent: string[] = [];
    await handleTelegramUpdate(
      {
        update_id: 30,
        callback_query: {
          id: "cb-profile",
          data: "m:profile",
          from: { id: 77 },
          message: { message_id: 4, chat: { id: 77, type: "private" } },
        },
      },
      async (_chatId, text) => {
        sent.push(text);
      },
    );
    assert.match(sent.at(-1) ?? "", /Profile/);
    assert.match(sent.at(-1) ?? "", /tg@example.com/);
    assert.match(sent.at(-1) ?? "", /Not linked/);
  });
});

describe("telegram errors", () => {
  it("hides the SQL when a database query fails", () => {
    const error = new Error(
      'Failed query: select "id" from "pooling_runs" where "pooling_runs"."user_id" = $1\nparams: abc',
    );
    error.cause = new Error("Connection terminated unexpectedly");
    assert.equal(formatTelegramError(error, "Could not sync Gmail."), "⚠️ Could not sync Gmail.");
  });

  it("keeps a short message the user can act on", () => {
    assert.equal(
      formatTelegramError(new Error("Add a bank and its statement sender on Import, then sync again."), "Could not sync Gmail."),
      "⚠️ Add a bank and its statement sender on Import, then sync again.",
    );
  });
});

describe("gmail sync progress", () => {
  it("shows a percent once Gmail has said how many messages are in the scan", () => {
    const text = syncProgressText({
      status: "running",
      scanned: 94,
      imported: 4,
      skipped: 0,
      errorMessage: null,
      estimate: 200,
    });
    assert.match(text, /47%/);
    assert.match(text, /Saved <b>4<\/b>/);
  });

  it("publishes counts while the run is going, then returns the finished run", async () => {
    const texts: string[] = [];
    let reads = 0;
    const finished = await followGmailSync({
      publish: async (text) => {
        texts.push(text);
      },
      read: async () => {
        reads += 1;
        if (reads < 3) {
          return {
            id: "run-1",
            status: "running",
            scanned: reads * 5,
            imported: reads,
            skipped: 0,
            errorMessage: null,
          };
        }
        return {
          id: "run-1",
          status: "completed",
          scanned: 12,
          imported: 2,
          skipped: 1,
          errorMessage: null,
        };
      },
      sleep: async () => undefined,
      maxTicks: 5,
    });
    assert.match(texts[0] ?? "", /Syncing Gmail/);
    assert.match(texts.at(-1) ?? "", /Saved <b>2<\/b>/);
    assert.equal(finished?.status, "completed");
    assert.equal(finished?.imported, 2);
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
