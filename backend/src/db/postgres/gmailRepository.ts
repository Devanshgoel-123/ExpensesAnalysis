import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { AppDb } from "../client.js";
import {
  accounts,
  gmailConnections,
  mailMessages,
  poolingRuns,
} from "../schema.js";
import type {
  AccountRow,
  GmailConnectionRow,
  MailMessageRow,
  PoolingRunRow,
  PoolingRunStatus,
} from "../types.js";
import {
  mapAccount,
  mapGmailConnection,
  mapMailMessage,
  mapPoolingRun,
} from "./shared.js";

const date = (value: string | null) => (value ? new Date(value) : null);

export class PostgresGmailRepository {
  constructor(private readonly db: AppDb) {}

  async upsertGmailConnection(
    input: Omit<GmailConnectionRow, "id"> & { id?: string },
  ): Promise<GmailConnectionRow> {
    const [row] = await this.db
      .insert(gmailConnections)
      .values({
        ...(input.id ? { id: input.id } : {}),
        userId: input.userId,
        googleEmail: input.googleEmail,
        refreshTokenEncrypted: input.refreshTokenEncrypted,
        accessTokenEncrypted: input.accessTokenEncrypted,
        tokenExpiry: date(input.tokenExpiry),
        historyId: input.historyId,
        watchExpiration: date(input.watchExpiration),
        lastSyncAt: date(input.lastSyncAt),
        lastScannedOn: input.lastScannedOn,
        disconnectedAt: null,
      })
      .onConflictDoUpdate({
        target: gmailConnections.userId,
        set: {
          googleEmail: input.googleEmail,
          refreshTokenEncrypted: sql`CASE WHEN excluded.refresh_token_encrypted <> '' THEN excluded.refresh_token_encrypted ELSE ${gmailConnections.refreshTokenEncrypted} END`,
          accessTokenEncrypted: sql`COALESCE(excluded.access_token_encrypted, ${gmailConnections.accessTokenEncrypted})`,
          tokenExpiry: date(input.tokenExpiry),
          historyId: sql`COALESCE(excluded.history_id, ${gmailConnections.historyId})`,
          watchExpiration: sql`COALESCE(excluded.watch_expiration, ${gmailConnections.watchExpiration})`,
          lastSyncAt: sql`COALESCE(excluded.last_sync_at, ${gmailConnections.lastSyncAt})`,
          lastScannedOn: input.lastScannedOn,
          disconnectedAt: null,
        },
      })
      .returning();
    return mapGmailConnection(row);
  }
  async getGmailConnection(userId: string): Promise<GmailConnectionRow | null> {
    const [row] = await this.db
      .select()
      .from(gmailConnections)
      .where(
        and(
          eq(gmailConnections.userId, userId),
          isNull(gmailConnections.disconnectedAt),
        ),
      )
      .limit(1);
    return row ? mapGmailConnection(row) : null;
  }
  async disconnectGmail(userId: string): Promise<void> {
    await this.db
      .update(gmailConnections)
      .set({
        disconnectedAt: new Date(),
        refreshTokenEncrypted: "",
        accessTokenEncrypted: null,
      })
      .where(eq(gmailConnections.userId, userId));
  }
  async listActiveGmailConnections(): Promise<GmailConnectionRow[]> {
    return (
      await this.db
        .select()
        .from(gmailConnections)
        .where(isNull(gmailConnections.disconnectedAt))
    ).map(mapGmailConnection);
  }
  async listPoolingAccounts(): Promise<AccountRow[]> {
    return (
      await this.db
        .select()
        .from(accounts)
        .where(eq(accounts.poolingEnabled, true))
    ).map(mapAccount);
  }
  async upsertMailMessage(
    input: Omit<MailMessageRow, "id" | "createdAt"> & { id?: string },
  ): Promise<MailMessageRow> {
    const [row] = await this.db
      .insert(mailMessages)
      .values({
        ...(input.id ? { id: input.id } : {}),
        userId: input.userId,
        accountId: input.accountId,
        gmailMessageId: input.gmailMessageId,
        fromAddress: input.fromAddress,
        subject: input.subject,
        receivedAt: date(input.receivedAt),
        amount: input.amount == null ? null : String(input.amount),
        txType: input.txType,
        currency: input.currency,
        fingerprint: input.fingerprint,
      })
      .onConflictDoUpdate({
        target: [mailMessages.userId, mailMessages.gmailMessageId],
        set: {
          fromAddress: input.fromAddress,
          subject: input.subject,
          receivedAt: sql`COALESCE(excluded.received_at, ${mailMessages.receivedAt})`,
          amount: sql`COALESCE(excluded.amount, ${mailMessages.amount})`,
          txType: sql`COALESCE(excluded.tx_type, ${mailMessages.txType})`,
          currency: input.currency,
          fingerprint: input.fingerprint,
        },
      })
      .returning();
    return mapMailMessage(row);
  }
  async findMailMessageByGmailId(
    userId: string,
    gmailMessageId: string,
  ): Promise<MailMessageRow | null> {
    const [row] = await this.db
      .select()
      .from(mailMessages)
      .where(
        and(
          eq(mailMessages.userId, userId),
          eq(mailMessages.gmailMessageId, gmailMessageId),
        ),
      )
      .limit(1);
    return row ? mapMailMessage(row) : null;
  }
  async createPoolingRun(
    input: Omit<PoolingRunRow, "id" | "startedAt" | "finishedAt" | "status"> & {
      id?: string;
      status?: PoolingRunStatus;
    },
  ): Promise<PoolingRunRow> {
    const [row] = await this.db
      .insert(poolingRuns)
      .values({
        ...(input.id ? { id: input.id } : {}),
        userId: input.userId,
        accountId: input.accountId,
        trigger: input.trigger,
        status: input.status ?? "running",
        mode: input.mode,
        month: input.month,
        scanned: input.scanned,
        imported: input.imported,
        skipped: input.skipped,
        errorMessage: input.errorMessage,
        meta: input.meta ?? {},
      })
      .returning();
    return mapPoolingRun(row);
  }
  async updatePoolingRun(
    id: string,
    patch: Partial<
      Pick<
        PoolingRunRow,
        | "status"
        | "scanned"
        | "imported"
        | "skipped"
        | "errorMessage"
        | "finishedAt"
        | "meta"
      >
    >,
  ): Promise<PoolingRunRow | null> {
    const set: Partial<typeof poolingRuns.$inferInsert> = {};
    for (const key of [
      "status",
      "scanned",
      "imported",
      "skipped",
      "errorMessage",
      "meta",
    ] as const)
      if (patch[key] != null)
        (set as Record<string, unknown>)[key] = patch[key];
    if (patch.finishedAt != null) set.finishedAt = new Date(patch.finishedAt);
    if (!Object.keys(set).length) {
      const [current] = await this.db
        .select()
        .from(poolingRuns)
        .where(eq(poolingRuns.id, id))
        .limit(1);
      return current ? mapPoolingRun(current) : null;
    }
    const [row] = await this.db
      .update(poolingRuns)
      .set(set)
      .where(eq(poolingRuns.id, id))
      .returning();
    return row ? mapPoolingRun(row) : null;
  }
  async getLatestPoolingRun(userId: string): Promise<PoolingRunRow | null> {
    const [row] = await this.db
      .select()
      .from(poolingRuns)
      .where(eq(poolingRuns.userId, userId))
      .orderBy(desc(poolingRuns.startedAt))
      .limit(1);
    return row ? mapPoolingRun(row) : null;
  }
  async listPoolingRuns(userId: string, limit = 10): Promise<PoolingRunRow[]> {
    return (
      await this.db
        .select()
        .from(poolingRuns)
        .where(eq(poolingRuns.userId, userId))
        .orderBy(desc(poolingRuns.startedAt))
        .limit(limit)
    ).map(mapPoolingRun);
  }
  async hasRunningPoolingRun(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: poolingRuns.id })
      .from(poolingRuns)
      .where(
        and(eq(poolingRuns.userId, userId), eq(poolingRuns.status, "running")),
      )
      .limit(1);
    return rows.length > 0;
  }
}
