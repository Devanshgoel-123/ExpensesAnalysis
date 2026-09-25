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
      }),
    ).toMatch(/Linked/);
  });
});
