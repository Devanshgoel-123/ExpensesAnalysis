import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetStoreForTests } from "../../src/db/index.js";
import { MemoryStore } from "../../src/db/memory.js";
import {
  buildTelegramDeepLink,
  handleTelegramUpdate,
  notifyMailDebits,
  parseStartCommand,
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
        counterparty: null,
        confidence: 0.4,
        classificationSource: "email_alert",
        fingerprint: "fp-tg-184",
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
});
