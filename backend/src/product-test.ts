/**
 * Productization smoke tests: auth tenancy, rules, dedup, providers, crypto.
 * Uses in-memory store (DATABASE_URL=memory).
 */

async function main() {
  process.env.DATABASE_URL = "memory";
  process.env.JWT_SECRET = "test-jwt-secret-16chars";
  process.env.ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const { loginUser, registerUser } = await import("./auth/service.js");
  const {
    decryptSecret,
    encryptSecret,
    transactionFingerprint,
  } = await import("./crypto/secrets.js");
  const { resetStoreForTests } = await import("./db/index.js");
  const { MemoryStore } = await import("./db/memory.js");
  const { applyRules, detectFromProviders, matchRule } = await import(
    "./rules/engine.js"
  );
  const { bankAdapters, runAdapters } = await import("./adapters/index.js");
  const {
    buildAnalytics,
    parseTransactions,
    stitchStatementLines,
  } = await import("./parser.js");

  const store = new MemoryStore();
  await store.migrate();
  await store.seedInvite("test-invite", 10);
  await store.seedInvite("iso-invite", 5);
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
  const categories = await store.listCategories(registered.user.id);
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
    {},
    categories,
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

  const swiggyMatch = detectFromProviders("UPI-SWIGGY-swiggy@ybl", providers);
  if (swiggyMatch.merchant !== "Swiggy") {
    throw new Error("detectFromProviders regression");
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

  const withLimit = await store.updateUserPreferences(registered.user.id, {
    dailySpendLimit: 1000,
  });
  if (withLimit?.dailySpendLimit !== 1000) {
    throw new Error("daily spend limit not saved");
  }

  const dashboardRows = [
    {
      importId: imp.id,
      accountId: account.id,
      date: "2026-08-10",
      time: null,
      description: "UPI-BIG",
      amount: 1500,
      type: "debit" as const,
      upiId: "big@ybl",
      merchant: null,
      payee: null,
      providerId: null,
      categorySlug: "other",
      counterparty: null,
      confidence: 1,
      classificationSource: "parser",
      fingerprint: "fp-big",
      raw: "UPI-BIG",
    },
  ];
  await store.insertTransactions(registered.user.id, dashboardRows);
  const { buildAnalyticsFromRows } = await import("./analytics/fromStore.js");
  const limited = buildAnalyticsFromRows(
    await store.listTransactions(registered.user.id),
    providers,
    [],
    categories,
    { dailySpendLimit: 1000 },
  );
  if (limited.dailyInsights.daysOverLimit.length < 1) {
    throw new Error("daily insights should flag over-limit day");
  }

  const swiggyForLogo = providers.find((p) => p.canonicalName === "Swiggy");
  if (!swiggyForLogo) throw new Error("Swiggy provider missing");
  const updatedLogo = await store.upsertProvider({
    ...swiggyForLogo,
    logoUrl: "/providers/swiggy.svg",
  });
  if (updatedLogo.logoUrl !== "/providers/swiggy.svg") {
    throw new Error("admin provider logo update failed");
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
