/**
 * Productization smoke tests: auth tenancy, rules, dedup, providers, crypto.
 * Uses in-memory store (DATABASE_URL=memory).
 */

async function main() {
  process.env.DATABASE_URL = "memory";
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  process.env.INVITE_CODES = "test-invite";

  const { loginUser, registerUser } = await import("./auth/service.js");
  const {
    decryptSecret,
    encryptSecret,
    transactionFingerprint,
  } = await import("./crypto/secrets.js");
  const { resetStoreForTests } = await import("./db/index.js");
  const { MemoryStore } = await import("./db/memory.js");
  const { seedGlobals } = await import("./providers/registry.js");
  const { applyRules, matchRule } = await import("./rules/engine.js");
  const { bankAdapters, runAdapters } = await import("./adapters/index.js");
  const {
    buildAnalytics,
    detectMerchant,
    detectPayee,
    parseTransactions,
    stitchStatementLines,
  } = await import("./parser.js");

  const store = new MemoryStore();
  await store.migrate();
  await store.seedInvite("test-invite", 10);
  await store.seedInvite("iso-invite", 5);
  await seedGlobals(store);
  resetStoreForTests(store);

  const secret = encryptSecret("refresh-token-xyz");
  if (decryptSecret(secret) !== "refresh-token-xyz") {
    throw new Error("encrypt/decrypt failed");
  }

  const registered = await registerUser({
    email: "beta@example.com",
    password: "password123",
    inviteCode: "test-invite",
    displayName: "Beta",
  });
  if (!registered.token) throw new Error("missing token");
  const loggedIn = await loginUser({
    email: "beta@example.com",
    password: "password123",
  });
  if (loggedIn.user.id !== registered.user.id) {
    throw new Error("login user mismatch");
  }

  try {
    await registerUser({
      email: "other@example.com",
      password: "password123",
      inviteCode: "nope",
    });
    throw new Error("bad invite should fail");
  } catch (error) {
    if (!(error instanceof Error) || !/invite/i.test(error.message)) {
      throw error;
    }
  }

  const providers = await store.listProviders(registered.user.id);
  if (providers.length < 5) throw new Error("providers not seeded");
  const swiggy = providers.find((p) => p.canonicalName === "Swiggy");
  if (!swiggy?.logoUrl) throw new Error("Swiggy logo missing");

  const rule = await store.createRule({
    userId: registered.user.id,
    name: "Track Deepan",
    priority: 10,
    enabled: true,
    matchNarrationRe: "deepan",
    matchUpiId: null,
    matchMerchantAlias: null,
    matchAmountMin: null,
    matchAmountMax: null,
    matchType: null,
    setProviderId: null,
    setPayeeName: "Deepan",
    setCategorySlug: null,
    setTags: [],
  });

  const classified = applyRules(
    {
      description: "UPI-DEEPAN-deepan@oksbi-UPI",
      upiId: "deepan@oksbi",
      merchant: null,
      amount: 500,
      type: "debit",
      payee: null,
    },
    [rule],
    providers,
  );
  if (classified.payee !== "Deepan") {
    throw new Error(`Expected Deepan payee, got ${classified.payee}`);
  }

  const fp = transactionFingerprint({
    date: "2026-07-03",
    amount: 35,
    type: "debit",
    description: "UPI-SNACK",
    upiId: "vendor@ybl",
  });
  const account = await store.getOrCreateAccount(registered.user.id);
  const imp = await store.createImport({
    userId: registered.user.id,
    accountId: account.id,
    source: "upload",
    status: "completed",
    filename: "a.pdf",
    gmailMessageId: null,
    attachmentHash: "hash1",
    bankAdapter: "hdfc",
    errorMessage: null,
    passwordEncrypted: null,
  });
  const row = {
    importId: imp.id,
    accountId: account.id,
    date: "2026-07-03",
    time: null,
    description: "UPI-SNACK",
    amount: 35,
    type: "debit" as const,
    upiId: "vendor@ybl",
    merchant: null,
    payee: null,
    providerId: null,
    categorySlug: "cigarettes",
    counterparty: null,
    confidence: 0.6,
    classificationSource: "amount_band",
    fingerprint: fp,
    raw: "UPI-SNACK",
  };
  const first = await store.insertTransactions(registered.user.id, [row]);
  const second = await store.insertTransactions(registered.user.id, [row]);
  if (first.inserted !== 1 || second.skipped !== 1) {
    throw new Error(`Dedup failed: ${JSON.stringify({ first, second })}`);
  }

  const user2 = await registerUser({
    email: "two@example.com",
    password: "password123",
    inviteCode: "iso-invite",
  });
  const user1Tx = await store.listTransactions(registered.user.id);
  const user2Tx = await store.listTransactions(user2.user.id);
  if (user1Tx.length !== 1 || user2Tx.length !== 0) {
    throw new Error("tenancy isolation failed");
  }

  const sample = `
01/07/26 UPI-SWIGGY-swiggy@ybl-111-UPI 0000111111111111 01/07/26 120.00 50,000.00
02/07/26 UPI-TEA-tea@ybl-444-UPI 0000444444444444 02/07/26 55.00 49,945.00
`;
  const { adapter, transactions } = runAdapters(sample, bankAdapters);
  if (adapter.id !== "hdfc" || transactions.length < 1) {
    throw new Error("HDFC adapter failed");
  }

  if (detectMerchant("UPI-SWIGGY") !== "Swiggy") {
    throw new Error("detectMerchant regression");
  }
  if (detectPayee("UPI-DEEPAN") !== "Deepan") {
    throw new Error("detectPayee regression");
  }
  const stitched = stitchStatementLines(sample.trim().split("\n"));
  const parsed = parseTransactions(stitched.join("\n"));
  const analytics = buildAnalytics(parsed);
  if (!analytics.summary.transactionCount) {
    throw new Error("analytics empty");
  }

  if (
    !matchRule(rule, {
      description: "payment to deepan cafe",
      upiId: null,
      merchant: null,
      amount: 10,
      type: "debit",
      payee: null,
    })
  ) {
    throw new Error("matchRule should hit narration");
  }

  await store.deleteUserData(registered.user.id);
  if ((await store.listTransactions(registered.user.id)).length !== 0) {
    throw new Error("deleteUserData left transactions");
  }
  if (await store.findUserById(registered.user.id)) {
    throw new Error("user should be soft-deleted");
  }

  console.log("product-test ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
