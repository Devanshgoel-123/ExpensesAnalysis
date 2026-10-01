import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { MemoryStore } from "../../src/db/memory.js";
import { closeStore, resetStoreForTests } from "../../src/db/index.js";
import { loginOrRegisterWithApple } from "../../src/auth/service.js";

describe("Sign in with Apple", () => {
  const store = new MemoryStore();

  after(async () => {
    await closeStore();
  });

  it("creates an account without a chosen password and signs in again by Apple id", async () => {
    resetStoreForTests(store);
    const first = await loginOrRegisterWithApple({
      appleSub: "apple-sub-1",
      email: "friend@privaterelay.appleid.com",
      displayName: "Friend",
    });
    const created = await store.findUserByAppleSub("apple-sub-1");
    assert.ok(created);
    assert.equal(created.email, "friend@privaterelay.appleid.com");
    assert.equal(created.displayName, "Friend");
    assert.notEqual(created.passwordHash, "");

    const second = await loginOrRegisterWithApple({ appleSub: "apple-sub-1" });
    assert.equal(second.user.id, first.user.id);
    assert.ok(second.token);
  });

  it("links an existing email instead of creating a second account", async () => {
    resetStoreForTests(store);
    const existing = await store.createUser({
      email: "dev@example.com",
      passwordHash: "already-set",
      displayName: "Dev",
    });
    const signedIn = await loginOrRegisterWithApple({
      appleSub: "apple-sub-2",
      email: "dev@example.com",
    });
    assert.equal(signedIn.user.id, existing.id);
    const linked = await store.findUserById(existing.id);
    assert.equal(linked?.appleSub, "apple-sub-2");
    assert.equal(linked?.passwordHash, "already-set");
  });
});
