import { childLogger } from "./index.js";

const log = childLogger({ module: "gmail" });

export const gmailLog = {
  syncComplete(input: {
    userId: string;
    month: string;
    statements: { scanned: number; imported: number; skipped: number };
    alerts: { scanned: number; imported: number; skipped: number };
  }): void {
    const totalImported = input.statements.imported + input.alerts.imported;
    if (totalImported === 0 && input.statements.scanned === 0 && input.alerts.scanned === 0) {
      log.debug(
        { userId: input.userId, month: input.month },
        "pooling sync — no new mail",
      );
      return;
    }
    log.info(
      {
        userId: input.userId,
        month: input.month,
        pdfImported: input.statements.imported,
        pdfSkipped: input.statements.skipped,
        alertImported: input.alerts.imported,
        alertSkipped: input.alerts.skipped,
      },
      `pooling ✓ ${input.month} — alerts +${input.alerts.imported} · PDF +${input.statements.imported}`,
    );
  },

  syncFailed(userId: string, error: unknown): void {
    log.warn(
      {
        userId,
        err: error instanceof Error ? error.message : String(error),
      },
      "pooling poll failed",
    );
  },

  enabled(userId: string, month: string): void {
    log.info({ userId, month }, `pooling enabled for ${month}`);
  },
};
