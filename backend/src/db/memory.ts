import { randomUUID } from "node:crypto";
import type {
  AccountRow,
  CategoryRow,
  GmailConnectionRow,
  ImportRow,
  NewTransactionInput,
  ProviderRow,
  Store,
  TransactionOverrideRow,
  TransactionRow,
  UserRow,
  UserRuleRow,
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export class MemoryStore implements Store {
  users = new Map<string, UserRow>();
  invites = new Map<string, { code: string; maxUses: number; usedCount: number }>();
  categories: CategoryRow[] = [];
  providers: ProviderRow[] = [];
  rules: UserRuleRow[] = [];
  accounts: AccountRow[] = [];
  imports: ImportRow[] = [];
  transactions: TransactionRow[] = [];
  overrides: TransactionOverrideRow[] = [];
  gmail: GmailConnectionRow[] = [];
  audits: Array<{ userId: string | null; action: string; meta: Record<string, unknown> }> =
    [];

  async migrate(): Promise<void> {
    // no-op
  }

  async createUser(input: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
  }): Promise<UserRow> {
    const email = input.email.toLowerCase();
    if ([...this.users.values()].some((u) => u.email === email && !u.deletedAt)) {
      throw new Error("Email already registered");
    }
    const user: UserRow = {
      id: randomUUID(),
      email,
      passwordHash: input.passwordHash,
      displayName: input.displayName ?? null,
      createdAt: nowIso(),
      deletedAt: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    return (
      [...this.users.values()].find(
        (u) => u.email === email.toLowerCase() && !u.deletedAt,
      ) ?? null
    );
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const user = this.users.get(id);
    if (!user || user.deletedAt) return null;
    return user;
  }

  async softDeleteUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) user.deletedAt = nowIso();
  }

  async consumeInvite(code: string): Promise<boolean> {
    const invite = this.invites.get(code);
    if (!invite) return false;
    if (invite.usedCount >= invite.maxUses) return false;
    invite.usedCount += 1;
    return true;
  }

  async seedInvite(code: string, maxUses = 100): Promise<void> {
    if (!this.invites.has(code)) {
      this.invites.set(code, { code, maxUses, usedCount: 0 });
    }
  }

  async listCategories(userId: string): Promise<CategoryRow[]> {
    return this.categories.filter((c) => c.isGlobal || c.userId === userId);
  }

  async upsertCategory(
    input: Omit<CategoryRow, "id"> & { id?: string },
  ): Promise<CategoryRow> {
    const existing = this.categories.find(
      (c) =>
        c.slug === input.slug &&
        ((input.isGlobal && c.isGlobal) || c.userId === input.userId),
    );
    if (existing) {
      Object.assign(existing, input, { id: existing.id });
      return existing;
    }
    const row: CategoryRow = { ...input, id: input.id ?? randomUUID() };
    this.categories.push(row);
    return row;
  }

  async listProviders(userId: string): Promise<ProviderRow[]> {
    return this.providers.filter((p) => p.isGlobal || p.userId === userId);
  }

  async upsertProvider(
    input: Omit<ProviderRow, "id"> & { id?: string },
  ): Promise<ProviderRow> {
    const existing = this.providers.find(
      (p) =>
        p.canonicalName.toLowerCase() === input.canonicalName.toLowerCase() &&
        ((input.isGlobal && p.isGlobal) || p.userId === input.userId),
    );
    if (existing) {
      Object.assign(existing, input, { id: existing.id });
      return existing;
    }
    const row: ProviderRow = { ...input, id: input.id ?? randomUUID() };
    this.providers.push(row);
    return row;
  }

  async findProviderByName(
    userId: string,
    name: string,
  ): Promise<ProviderRow | null> {
    const lower = name.toLowerCase();
    return (
      (await this.listProviders(userId)).find(
        (p) =>
          p.canonicalName.toLowerCase() === lower ||
          p.aliases.some((a) => a.toLowerCase() === lower),
      ) ?? null
    );
  }

  async listRules(userId: string): Promise<UserRuleRow[]> {
    return this.rules
      .filter((r) => r.userId === userId && r.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  async createRule(
    input: Omit<UserRuleRow, "id"> & { id?: string },
  ): Promise<UserRuleRow> {
    const row: UserRuleRow = { ...input, id: input.id ?? randomUUID() };
    this.rules.push(row);
    return row;
  }

  async deleteRule(userId: string, ruleId: string): Promise<void> {
    this.rules = this.rules.filter(
      (r) => !(r.userId === userId && r.id === ruleId),
    );
  }

  async getOrCreateAccount(userId: string, bank = "HDFC"): Promise<AccountRow> {
    const existing = this.accounts.find(
      (a) => a.userId === userId && a.bank === bank,
    );
    if (existing) return existing;
    const row: AccountRow = {
      id: randomUUID(),
      userId,
      bank,
      label: "Primary",
    };
    this.accounts.push(row);
    return row;
  }

  async createImport(
    input: Omit<ImportRow, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<ImportRow> {
    const stamp = nowIso();
    const row: ImportRow = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.imports.push(row);
    return row;
  }

  async updateImport(
    id: string,
    userId: string,
    patch: Partial<ImportRow>,
  ): Promise<ImportRow | null> {
    const row = this.imports.find((i) => i.id === id && i.userId === userId);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: nowIso() });
    return row;
  }

  async listImports(userId: string): Promise<ImportRow[]> {
    return this.imports
      .filter((i) => i.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getImport(userId: string, id: string): Promise<ImportRow | null> {
    return this.imports.find((i) => i.id === id && i.userId === userId) ?? null;
  }

  async findImportByHash(
    userId: string,
    attachmentHash: string,
  ): Promise<ImportRow | null> {
    return (
      this.imports.find(
        (i) => i.userId === userId && i.attachmentHash === attachmentHash,
      ) ?? null
    );
  }

  async findImportByGmailMessage(
    userId: string,
    gmailMessageId: string,
  ): Promise<ImportRow | null> {
    return (
      this.imports.find(
        (i) => i.userId === userId && i.gmailMessageId === gmailMessageId,
      ) ?? null
    );
  }

  async insertTransactions(
    userId: string,
    rows: NewTransactionInput[],
  ): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;
    for (const row of rows) {
      if (this.transactions.some((t) => t.userId === userId && t.fingerprint === row.fingerprint)) {
        skipped += 1;
        continue;
      }
      this.transactions.push({
        id: randomUUID(),
        userId,
        ...row,
      });
      inserted += 1;
    }
    return { inserted, skipped };
  }

  async listTransactions(userId: string): Promise<TransactionRow[]> {
    return this.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getTransaction(
    userId: string,
    id: string,
  ): Promise<TransactionRow | null> {
    return (
      this.transactions.find((t) => t.id === id && t.userId === userId) ?? null
    );
  }

  async updateTransaction(
    userId: string,
    id: string,
    patch: Partial<TransactionRow>,
  ): Promise<TransactionRow | null> {
    const row = await this.getTransaction(userId, id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  }

  async reclassifyByRule(
    userId: string,
    matcher: (tx: TransactionRow) => boolean,
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    let count = 0;
    for (const tx of this.transactions) {
      if (tx.userId !== userId) continue;
      if (!matcher(tx)) continue;
      Object.assign(tx, patch);
      count += 1;
    }
    return count;
  }

  async upsertOverride(
    input: Omit<TransactionOverrideRow, "id"> & { id?: string },
  ): Promise<TransactionOverrideRow> {
    const existing = this.overrides.find(
      (o) => o.transactionId === input.transactionId,
    );
    if (existing) {
      Object.assign(existing, input, { id: existing.id });
      return existing;
    }
    const row: TransactionOverrideRow = {
      ...input,
      id: input.id ?? randomUUID(),
    };
    this.overrides.push(row);
    return row;
  }

  async upsertGmailConnection(
    input: Omit<GmailConnectionRow, "id"> & { id?: string },
  ): Promise<GmailConnectionRow> {
    const existing = this.gmail.find((g) => g.userId === input.userId);
    if (existing) {
      Object.assign(existing, input, {
        id: existing.id,
        disconnectedAt: null,
      });
      return existing;
    }
    const row: GmailConnectionRow = {
      ...input,
      id: input.id ?? randomUUID(),
    };
    this.gmail.push(row);
    return row;
  }

  async getGmailConnection(userId: string): Promise<GmailConnectionRow | null> {
    return (
      this.gmail.find((g) => g.userId === userId && !g.disconnectedAt) ?? null
    );
  }

  async disconnectGmail(userId: string): Promise<void> {
    const row = this.gmail.find((g) => g.userId === userId);
    if (row) {
      row.disconnectedAt = nowIso();
      row.refreshTokenEncrypted = "";
      row.accessTokenEncrypted = null;
    }
  }

  async listActiveGmailConnections(): Promise<GmailConnectionRow[]> {
    return this.gmail.filter((g) => !g.disconnectedAt);
  }

  async audit(
    userId: string | null,
    action: string,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    this.audits.push({ userId, action, meta });
  }

  async deleteUserData(userId: string): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.userId !== userId);
    this.imports = this.imports.filter((i) => i.userId !== userId);
    this.rules = this.rules.filter((r) => r.userId !== userId);
    this.overrides = this.overrides.filter((o) => o.userId !== userId);
    this.accounts = this.accounts.filter((a) => a.userId !== userId);
    this.providers = this.providers.filter((p) => p.userId !== userId);
    this.categories = this.categories.filter((c) => c.userId !== userId);
    this.gmail = this.gmail.filter((g) => g.userId !== userId);
    await this.softDeleteUser(userId);
  }
}
