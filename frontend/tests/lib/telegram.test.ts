import { describe, expect, it } from "vitest";
import { telegramConnectHint } from "@/lib/telegram";

describe("telegramConnectHint", () => {
  it("explains when the bot is not configured", () => {
    expect(
      telegramConnectHint({
        configured: false,
        linked: false,
        botUsername: null,
      }),
    ).toMatch(/not enabled/i);
  });

  it("confirms a linked chat", () => {
    expect(
      telegramConnectHint({
        configured: true,
        linked: true,
        botUsername: "ledgerline_bot",
        phone: "+91 •••• 3210",
      }),
    ).toMatch(/Linked to \+91/);
  });

  it("tells an unlinked account to share the number with the bot", () => {
    expect(
      telegramConnectHint({
        configured: true,
        linked: false,
        botUsername: "ledgerline_bot",
        verify: {
          phone: "+91 •••• 3210",
          codeSent: false,
          expiresAt: null,
          botUrl: "https://t.me/ledgerline_bot?start=verify",
        },
      }),
    ).toMatch(/Share my number/);
  });
});
